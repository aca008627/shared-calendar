import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc,
  onSnapshot, query, orderBy, serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/*
  Firebase 設定：
  1. Authentication > Sign-in method > Email/Password 啟用
  2. 建立 Firestore Database
  3. 套用本專案 firestore.rules
  4. 把 Firebase Web App 設定貼到下方
*/
const firebaseConfig = {
  apiKey: "AIzaSyB2TrFMW3mFea1LaBA-8wymzQ7ATeItI1M",
  authDomain: "shared-calendar-ffd9a.firebaseapp.com",
  projectId: "shared-calendar-ffd9a",
  storageBucket: "shared-calendar-ffd9a.firebasestorage.app",
  messagingSenderId: "221775752292",
  appId: "1:221775752292:web:dae48c0ed86fa660230371"
};

const COLORS = ["#2f6fed","#e74c3c","#20a464","#9b59b6","#f39c12","#00a6b2","#e84393","#6c5ce7"];
const pad = n => String(n).padStart(2,"0");
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const randomCode = () => "CAL-" + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0,8);

// ===== 台灣節日顯示 =====
// 顯示節日名稱，不等同政府公告的補假/連假日。
const FIXED_HOLIDAYS = {
  "01-01": "元旦",
  "02-28": "和平紀念日",
  "04-04": "兒童節",
  "05-01": "勞動節",
  "08-08": "父親節",
  "10-10": "國慶日",
  "10-25": "臺灣光復節",
  "12-25": "聖誕節"
};

function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const d = new Date(year, monthIndex, 1);
  const shift = (weekday - d.getDay() + 7) % 7;
  d.setDate(1 + shift + (nth - 1) * 7);
  return d;
}

function getLunarMonthDay(date) {
  try {
    const fmt = new Intl.DateTimeFormat("zh-TW-u-ca-chinese", {
      month: "numeric",
      day: "numeric"
    });
    const parts = fmt.formatToParts(date);
    const monthPart = parts.find(p => p.type === "month")?.value || "";
    const dayPart = parts.find(p => p.type === "day")?.value || "";
    const m = parseInt(monthPart.replace(/\D/g, ""), 10);
    const d = parseInt(dayPart.replace(/\D/g, ""), 10);
    if (!Number.isNaN(m) && !Number.isNaN(d)) return { month: m, day: d };
  } catch (e) {
    console.warn("無法取得農曆日期", e);
  }
  return null;
}

function getHolidayName(date) {
  const mmdd = `${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const names = [];

  if (FIXED_HOLIDAYS[mmdd]) names.push(FIXED_HOLIDAYS[mmdd]);

  const mothersDay = nthWeekdayOfMonth(date.getFullYear(), 4, 0, 2);
  if (dateKey(date) === dateKey(mothersDay)) names.push("母親節");

  const lunar = getLunarMonthDay(date);
  if (lunar) {
    const key = `${lunar.month}-${lunar.day}`;
    const lunarFestivals = {
      "1-1": "農曆春節",
      "1-15": "元宵節",
      "5-5": "端午節",
      "7-7": "七夕",
      "8-15": "中秋節",
      "9-9": "重陽節"
    };
    if (lunarFestivals[key]) names.push(lunarFestivals[key]);
  }
  return names.join("・");
}

const normalizeEmail = v => String(v || "").trim().toLowerCase();
const el = id => document.getElementById(id);

let app, auth, db, user = null;
let unsubscribeEvents = null, unsubscribeCalendar = null;
let allEvents = [], calendarMeta = null;
let currentMonth = new Date(); currentMonth.setDate(1);
let selectedDate = new Date();
let profile = JSON.parse(localStorage.getItem("sharedCalProfileSecure") || "null");

function saveProfile(){ localStorage.setItem("sharedCalProfileSecure", JSON.stringify(profile)); }
function setStatus(t){ el("syncStatus").textContent = t; }
function show(id){ el(id).classList.remove("hidden"); }
function hide(id){ el(id).classList.add("hidden"); }
function firebaseConfigured(){ return !Object.values(firebaseConfig).some(v => String(v).includes("請填入")); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]); }

async function initFirebase(){
  if(!firebaseConfigured()){
    setStatus("尚未設定 Firebase");
    alert("此版本已改成安全登入版。請先把 Firebase Web App 設定貼入 app.js。詳情請看 README.md。");
    return;
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, async u => {
    user = u;
    if(!u){
      cleanupListeners(); allEvents=[]; calendarMeta=null; setStatus("尚未登入"); show("authBackdrop"); renderCalendar(); renderDayEvents(); return;
    }
    hide("authBackdrop");
    setStatus(`已登入：${u.email}`);
    if(profile?.calendarCode){
      const ok = await openCalendar(profile.calendarCode, false);
      if(!ok) show("calendarAccessBackdrop");
    }else show("calendarAccessBackdrop");
  });
}

function cleanupListeners(){
  if(unsubscribeEvents){ unsubscribeEvents(); unsubscribeEvents=null; }
  if(unsubscribeCalendar){ unsubscribeCalendar(); unsubscribeCalendar=null; }
}

async function openCalendar(code, showError=true){
  if(!db || !user) return false;
  const normalized = String(code||"").trim().toUpperCase();
  if(!normalized) return false;
  try{
    const ref = doc(db,"calendars",normalized);
    const snap = await getDoc(ref);
    if(!snap.exists()) throw new Error("找不到這個共用行事曆");
    const data = snap.data();
    const email = normalizeEmail(user.email);
    if(!(data.members || []).map(normalizeEmail).includes(email)) throw new Error("你的 Email 尚未被管理員加入");
    profile = profile || {};
    profile.calendarCode = normalized;
    profile.memberName = profile.memberName || email.split("@")[0];
    profile.color = profile.color || COLORS[Math.floor(Math.random()*COLORS.length)];
    saveProfile();
    subscribeCalendar(); subscribeEvents();
    hide("calendarAccessBackdrop");
    return true;
  }catch(err){
    console.error(err);
    if(showError) alert(err.message || "無法開啟行事曆");
    return false;
  }
}

async function createCalendar(){
  if(!db || !user) return;
  const name = el("firstName").value.trim() || user.email.split("@")[0];
  const code = randomCode();
  const email = normalizeEmail(user.email);
  await setDoc(doc(db,"calendars",code),{
    ownerUid:user.uid,
    ownerEmail:email,
    members:[email],
    createdAt:serverTimestamp()
  });
  profile={calendarCode:code,memberName:name,color:COLORS[Math.floor(Math.random()*COLORS.length)]}; saveProfile();
  await openCalendar(code);
}

function subscribeCalendar(){
  if(unsubscribeCalendar) unsubscribeCalendar();
  unsubscribeCalendar = onSnapshot(doc(db,"calendars",profile.calendarCode), snap=>{
    if(!snap.exists()) return;
    calendarMeta=snap.data(); setStatus("已安全同步"); renderSettingsState();
  },err=>{ console.error(err); setStatus("存取被拒絕"); });
}

function subscribeEvents(){
  if(unsubscribeEvents) unsubscribeEvents();
  const q = query(collection(db,"calendars",profile.calendarCode,"events"),orderBy("date","asc"));
  unsubscribeEvents=onSnapshot(q,snap=>{
    allEvents=snap.docs.map(d=>({id:d.id,...d.data()})); renderCalendar(); renderDayEvents(); setStatus("已安全同步");
  },err=>{ console.error(err); setStatus("同步錯誤"); });
}

function renderCalendar(){
  const y=currentMonth.getFullYear(),m=currentMonth.getMonth(); el("monthTitle").textContent=`${y} 年 ${m+1} 月`;
  const start=new Date(y,m,1-new Date(y,m,1).getDay()); const grid=el("calendarGrid"); grid.innerHTML="";
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i); const k=dateKey(d); const day=document.createElement("button");
    day.className="day"; day.style.borderLeft=day.style.borderRight=day.style.borderBottom="0"; day.style.backgroundColor="transparent"; day.style.font="inherit";
    if(d.getMonth()!==m) day.classList.add("other"); if(k===dateKey(new Date())) day.classList.add("today"); if(k===dateKey(selectedDate)) day.classList.add("selected");
    const events=allEvents.filter(e=>e.date===k); const dots=events.slice(0,4).map(e=>`<span class="dot" style="background:${e.color||'#2f6fed'}"></span>`).join("");
    const holiday=getHolidayName(d); if(holiday) day.classList.add("holiday-day");
    day.innerHTML=`<div class="day-number">${d.getDate()}</div>${holiday?`<div class="holiday-name">${holiday}</div>`:""}<div class="dots">${dots}</div>`;
    day.onclick=()=>{selectedDate=new Date(d);currentMonth=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();renderDayEvents();}; grid.appendChild(day);
  }
}

function renderDayEvents(){
  const k=dateKey(selectedDate),weekday=["日","一","二","三","四","五","六"][selectedDate.getDay()];
  el("selectedDateTitle").textContent=`${selectedDate.getMonth()+1} 月 ${selectedDate.getDate()} 日`; const holiday=getHolidayName(selectedDate); el("selectedDateSub").textContent=holiday?`星期${weekday} · ${holiday}`:`星期${weekday}`;
  const events=allEvents.filter(e=>e.date===k).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")); const list=el("eventList"); list.innerHTML="";
  if(!user){list.innerHTML='<div class="empty">請先登入</div>';return;} if(!profile?.calendarCode){list.innerHTML='<div class="empty">請建立或加入共用行事曆</div>';return;} if(!events.length){list.innerHTML='<div class="empty">這一天還沒有事件</div>';return;}
  for(const ev of events){ const card=document.createElement("div"); card.className="event-card"; card.innerHTML=`<div class="event-stripe" style="background:${ev.color||'#2f6fed'}"></div><div><div class="event-title">${escapeHtml(ev.title||"")}</div><div class="event-meta">${ev.time||"全天"} · ${escapeHtml(ev.ownerName||"成員")}</div>${ev.note?`<div class="event-note">${escapeHtml(ev.note)}</div>`:""}</div><button class="secondary-btn">編輯</button>`; card.querySelector("button").onclick=()=>openEventModal(ev); list.appendChild(card); }
}

function openEventModal(ev=null){
  if(!user || !profile?.calendarCode){ alert("請先登入並開啟共用行事曆"); return; }
  el("eventForm").reset(); el("eventId").value=ev?.id||""; el("eventTitle").value=ev?.title||""; el("eventDate").value=ev?.date||dateKey(selectedDate); el("eventTime").value=ev?.time||""; el("eventNote").value=ev?.note||""; el("modalTitle").textContent=ev?"編輯事件":"新增事件"; el("deleteEventBtn").classList.toggle("hidden",!ev); show("modalBackdrop");
}

async function saveEvent(e){
  e.preventDefault();
  const data={title:el("eventTitle").value.trim(),date:el("eventDate").value,time:el("eventTime").value,note:el("eventNote").value.trim(),ownerName:profile.memberName,ownerEmail:normalizeEmail(user.email),color:profile.color,updatedAt:serverTimestamp()};
  const id=el("eventId").value; if(id) await updateDoc(doc(db,"calendars",profile.calendarCode,"events",id),data); else {data.createdAt=serverTimestamp(); await addDoc(collection(db,"calendars",profile.calendarCode,"events"),data);} hide("modalBackdrop");
}

async function deleteCurrentEvent(){ const id=el("eventId").value; if(id&&confirm("確定刪除這個事件？")){await deleteDoc(doc(db,"calendars",profile.calendarCode,"events",id));hide("modalBackdrop");} }
function isAdmin(){ return !!(user && calendarMeta && calendarMeta.ownerUid===user.uid); }

function renderColors(){ const w=el("colorPicker"); w.innerHTML=""; COLORS.forEach(c=>{const b=document.createElement("button");b.type="button";b.className="color-option"+(profile?.color===c?" active":"");b.style.background=c;b.onclick=()=>{profile.color=c;saveProfile();renderColors();};w.appendChild(b);}); }
function renderSettingsState(){
  if(!user) return; el("accountInfo").textContent=`登入帳號：${user.email}`; el("memberName").value=profile?.memberName||""; el("calendarCode").value=profile?.calendarCode||""; renderColors();
  el("adminSection").classList.toggle("hidden",!isAdmin()); const list=el("memberList"); list.innerHTML="";
  if(isAdmin() && calendarMeta?.members){ calendarMeta.members.forEach(email=>{const row=document.createElement("div");row.className="member-row";const owner=normalizeEmail(email)===normalizeEmail(calendarMeta.ownerEmail);row.innerHTML=`<span>${escapeHtml(email)}${owner?"（管理員）":""}</span>`; if(!owner){const b=document.createElement("button");b.className="danger-btn small-btn";b.textContent="移除";b.onclick=()=>removeMember(email);row.appendChild(b);}list.appendChild(row);}); }
}
function openSettings(){ if(!user){show("authBackdrop");return;} renderSettingsState(); show("settingsBackdrop"); }
async function inviteMember(){ if(!isAdmin()) return; const email=normalizeEmail(el("inviteEmail").value); if(!email){alert("請輸入 Email");return;} await updateDoc(doc(db,"calendars",profile.calendarCode),{members:arrayUnion(email)}); el("inviteEmail").value=""; }
async function removeMember(email){ if(!isAdmin()) return; if(confirm(`移除 ${email}？`)) await updateDoc(doc(db,"calendars",profile.calendarCode),{members:arrayRemove(normalizeEmail(email))}); }

function bind(){
  el("prevMonth").onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()-1);renderCalendar();}; el("nextMonth").onclick=()=>{currentMonth.setMonth(currentMonth.getMonth()+1);renderCalendar();}; el("todayBtn").onclick=()=>{selectedDate=new Date();currentMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);renderCalendar();renderDayEvents();};
  el("addEventBtn").onclick=()=>openEventModal(); el("closeModal").onclick=()=>hide("modalBackdrop"); el("cancelEventBtn").onclick=()=>hide("modalBackdrop"); el("eventForm").onsubmit=saveEvent; el("deleteEventBtn").onclick=deleteCurrentEvent;
  el("settingsBtn").onclick=openSettings; el("closeSettings").onclick=()=>hide("settingsBackdrop"); el("saveSettingsBtn").onclick=()=>{profile.memberName=el("memberName").value.trim()||user.email.split("@")[0];saveProfile();hide("settingsBackdrop");renderDayEvents();};
  el("copyCodeBtn").onclick=async()=>{await navigator.clipboard.writeText(profile.calendarCode);alert("共用代碼已複製");}; el("inviteBtn").onclick=inviteMember;
  el("logoutBtn").onclick=async()=>{hide("settingsBackdrop");cleanupListeners();await signOut(auth);};
  el("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,normalizeEmail(el("authEmail").value),el("authPassword").value);}catch(e){alert("登入失敗："+e.message);}};
  el("registerBtn").onclick=async()=>{try{await createUserWithEmailAndPassword(auth,normalizeEmail(el("authEmail").value),el("authPassword").value);}catch(e){alert("建立帳號失敗："+e.message);}};
  el("createCalendarBtn").onclick=createCalendar; el("joinCalendarBtn").onclick=async()=>{profile=profile||{};profile.memberName=el("firstName").value.trim()||user.email.split("@")[0];profile.color=profile.color||COLORS[Math.floor(Math.random()*COLORS.length)];saveProfile();await openCalendar(el("firstCode").value,true);};
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
}

bind(); renderCalendar(); renderDayEvents(); initFirebase();
