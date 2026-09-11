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
