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
