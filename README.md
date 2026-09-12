# 安全共用行事曆 PWA（iPhone）

這版已改為較安全的「登入 + 受邀成員制」。

## 已加入的安全機制
- Email / 密碼登入
- 不再使用匿名登入
- 每個共用行事曆有管理員（建立者）
- 只有管理員加入的 Email 才能讀取該行事曆
- 即使別人知道 `CAL-XXXXXX` 代碼，只要 Email 不在成員名單，就無法讀寫
- Firestore 禁止列出所有行事曆，只允許已授權成員讀取指定行事曆
- 管理員可新增 / 移除成員
- 已授權成員可共同新增、編輯、刪除事件
- Firebase Firestore 即時同步

## Firebase 設定
### 1. 建立 Firebase 專案
Firebase Console → 建立專案 → 新增 Web App。

### 2. 啟用 Email / Password
Authentication → Sign-in method → Email/Password → Enable。

### 3. 建立 Firestore
Firestore Database → Create database。

### 4. 設定 Rules
把本資料夾 `firestore.rules` 全部內容貼到 Firestore → Rules → Publish。

### 5. 貼入 Web App 設定
在 Firebase 專案設定中取得：
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```
貼到 `app.js` 頂端對應位置。

## 使用方式
### 第一位使用者（管理員）
1. 開啟網站
2. 建立 Email / 密碼帳號
3. 選「建立新行事曆」
4. 系統建立一組 `CAL-XXXXXX` 代碼
5. 到設定 → 邀請成員 → 先加入家人的 Email
6. 再把共用代碼傳給家人

### 第二位使用者
1. 使用「管理員已加入的相同 Email」建立帳號 / 登入
2. 輸入管理員提供的 `CAL-XXXXXX`
3. 系統確認 Email 在成員名單後才會開啟

## iPhone 安裝
Safari 開啟 HTTPS 網站 → 分享 → 加入主畫面。

## 網站放置
可使用 GitHub Pages、Firebase Hosting、Netlify 或 Vercel。網站本身可以放 GitHub Pages；多人即時資料仍由 Firebase Firestore 負責。

## 重要安全提醒
- 請使用強密碼。
- 不要把 Firebase Rules 設成 `allow read, write: if true;`。
- 共用代碼不是密碼；真正的存取控制是「登入帳號 + 成員 Email 名單」。
- 這個版本適合家庭 / 小團隊共用。若未來要公開給大量使用者，建議再加入 Email 驗證、密碼重設、操作紀錄與管理員角色系統。


## 節日顯示
已加入台灣常用國曆與農曆節日名稱。節日名稱僅供辨識，不代表政府公告的補假或連假安排。

## 事件提醒
- 新增／編輯事件可選：不提醒、10 分鐘前、30 分鐘前、1 小時前、1 天前。
- 設定頁可按「啟用 iPhone 通知」授權系統通知。
- 首頁會顯示未來 24 小時內即將到來的事件。
- 本純前端 PWA 版本會在 App 開啟或仍在執行期間檢查提醒。
- 若要保證 App 完全關閉後仍由伺服器準時推播，需要另外設定 Firebase Cloud Messaging + 後端排程。

## 人物 icon 與新增提醒
- 建立／編輯事件時可選：爸爸、媽媽、小男孩、或不使用 icon。
- 事件列表與即將到來提醒會顯示所選人物 icon。
- 提醒新增：2 天前、3 天前、1 週前。


## v6：重新安裝自動找回行事曆
使用者的 calendarCode、顯示名稱與顏色會另外儲存在 Firestore `/users/{uid}`。
因此刪除 iPhone 主畫面的 PWA 再重新加入後，只要用同一個帳號登入，會自動找回原本的共用行事曆，不需重新輸入代碼。

重要：必須把新版 `firestore.rules` 貼到 Firebase Console → Firestore Database → 規則，並按「發布」。


## v7 修正
- 修正人物 icon 無法點選。
- 人物 icon 選單改為純圖示，不顯示名稱。
- 事件新增「結束時間」欄位，並在列表顯示時間區間。
- 提醒邏輯改為：提醒時間到後，只要事件尚未開始且尚未提醒，就補送一次。
- 設定頁新增「測試通知」按鈕。

### iPhone 通知限制
此純 PWA 版本的本機提醒，需要 App 仍在執行或重新被喚醒。
若 App 被 iOS 完全終止，JavaScript 無法在背景自行定時執行。
要做到 App 完全關閉仍保證準時推播，需要 Firebase Cloud Messaging + 雲端排程/後端。

## 免費 iPhone 原生提醒
每筆事件新增「加入 iPhone 行事曆」按鈕。匯出的 .ics 會帶入日期、開始/結束時間、備註與提醒時間。
加入 Apple 行事曆後，即使本 PWA 完全關閉，通知仍由 iOS 原生行事曆負責。
不需要 Firebase Blaze，也不需要綁信用卡。

注意：共用事件後續若被修改，Apple 行事曆中的已匯入副本不會自動同步更新，需要重新匯入。


## v9：人物 Icon 可複選
- 建立／編輯事件時可同時選擇多個人物，例如爸爸＋媽媽、媽媽＋小男孩、或全家。
- 再點一次已選 icon 可取消。
- 點「不使用」會清除所有人物 icon。
- 舊事件若只有單一 `eventIcon`，仍可正常顯示，編輯後會轉為新版 `eventIcons` 陣列。


## v10：跨日事件
- 新增「結束日期」欄位。
- 事件可設定開始日期＋開始時間，以及結束日期＋結束時間。
- 支援跨日事件，例如 9/20 18:00 → 9/21 10:00。
- iPhone .ics 匯出也會帶入正確的跨日開始與結束時間。

## v11：事件標題＋週期
- 月曆日期格直接顯示事件標題。
- 同一天最多顯示 3 筆，更多顯示 +N。
- 事件週期：不重複、每天、每週、每月、每年。
- 可設定「重複到」日期。
- 匯出 iPhone 行事曆時包含 RRULE 重複規則。

## v12：忘記密碼＋中文錯誤提示
- 登入畫面新增「忘記密碼」。
- 輸入 Email 後由 Firebase 寄送密碼重設信。
- 常見 Firebase Authentication 錯誤改為中文提示。


## v13：點年月快速跳日期
- 點月曆上方「YYYY 年 M 月」即可叫出 iPhone 原生日期選擇器。
- 可直接跨月、跨年選擇任意日期。
- 選定後會自動跳到該月份並選中該日。


## v14：日期快速跳轉修正
- 修正 iPhone PWA 點「YYYY 年 M 月」沒有反應。
- 改成真正的按鈕＋自製日期選擇視窗。
- 可自由選年份、月份、日期，跨月與跨年皆可。


## v16：截圖同款排版＋上一版日期跳轉
- 月份標題完全置中。
- 「今天」固定顯示在月份標題正下方。
- 左右切換月份箭頭保留。
- 點月份標題仍使用自製的「年份／月份／日期」跳轉視窗。


## v19：iPhone 主畫面 PWA 修正
- Safari 與加入主畫面的 PWA 使用同一最新版程式。
- HTML / JS / CSS 改為 network-first，避免主畫面卡在舊快取。
- 加入版本參數 `20260912-v19` 強制更新。
- 保留目前排版與完整月曆式日期跳轉。

## v20：iPhone 主畫面白畫面修正
- 修正日期跳轉舊程式殘留造成的 JavaScript 執行中斷。
- 修正「年份月份空白、月曆空白、尚未登入」問題。
- 保留目前正確排版與月曆式日期跳轉。
- 再次更新 PWA 快取版本，強制主畫面載入新版。
