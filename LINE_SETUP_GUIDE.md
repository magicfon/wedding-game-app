# 🔗 Line 整合設置指南

您的 Web App 域名：**https://wedding-game-app.vercel.app/**

## 第一步：設置 Line Login Channel

### 1. 前往 Line Developers Console
- 訪問 [developers.line.biz](https://developers.line.biz)
- 使用您的 Line 帳號登入

### 2. 創建 Provider（如果還沒有）
- 點擊 "Create a new provider"
- 輸入 Provider 名稱：`婚禮遊戲`

### 3. 創建 Line Login Channel
- 點擊 "Create a new channel"
- 選擇 "LINE Login"
- 填寫資訊：
  - **Channel name**: 婚禮互動遊戲
  - **Channel description**: 婚禮互動遊戲系統
  - **App type**: Web app
  - **Email address**: 您的郵箱

### 4. 設置 Callback URL ⭐ **重要**
在 Channel 設置的 "App settings" 中：
- **Callback URL**: `https://wedding-game-app.vercel.app/auth/line`

### 5. 獲取 Line Login 資訊 📝
在 "Basic settings" 中複製：
- **Channel ID** (需要設置為環境變數 `LINE_LOGIN_CHANNEL_ID`)
- **Channel secret** (需要設置為環境變數 `LINE_LOGIN_CHANNEL_SECRET`)

---

## 第二步：創建 Line Bot (Messaging API)

### 1. 創建 Messaging API Channel
- 在同一個 Provider 下，點擊 "Create a new channel"
- 選擇 "Messaging API"
- 填寫基本資訊：
  - **Channel name**: 婚禮互動遊戲 Bot
  - **Channel description**: 婚禮互動遊戲選單機器人

### 2. 設置 Webhook URL ⭐ **重要**
在 "Messaging API settings" 中：
- **Webhook URL**: `https://wedding-game-app.vercel.app/api/line/webhook`
- **Use webhook**: 開啟 ✅
- **Auto-reply messages**: 關閉 ❌
- **Greeting messages**: 開啟 ✅

### 3. 獲取 Bot 資訊 📝
在 "Messaging API settings" 中：
- **Channel access token** (長期) (需要設置為環境變數 `LINE_CHANNEL_ACCESS_TOKEN`)
- **Channel secret** (在 Basic settings 中，需要設置為環境變數 `LINE_CHANNEL_SECRET`)

---

## 第三步：在 Vercel 設置環境變數

### 前往 Vercel 專案設置
1. 登入 [vercel.com](https://vercel.com)
2. 進入您的 `wedding-game-app` 專案
3. 點擊 "Settings" 標籤
4. 點擊左側的 "Environment Variables"

### 添加以下環境變數：

```bash
# Line Login 設置
LINE_LOGIN_CHANNEL_ID=從第一步獲取的 Channel ID
LINE_LOGIN_CHANNEL_SECRET=從第一步獲取的 Channel secret

# Line Bot 設置  
LINE_CHANNEL_ACCESS_TOKEN=從第二步獲取的 Channel access token
LINE_CHANNEL_SECRET=從第二步獲取的 Channel secret

# 應用程式 URL
NEXT_PUBLIC_APP_URL=https://wedding-game-app.vercel.app

# 其他必要設置（如果還沒有）
ADMIN_PASSWORD=admin123
NEXTAUTH_SECRET=your-random-secret-string-here
```

### 設置完成後
- 點擊 "Deployments" 標籤
- 重新部署應用程式

---

## 第四步：測試 Line 整合

### 1. 測試 Line Bot
- 用手機掃描 Line Bot 的 QR Code 加入好友
- 發送任何訊息，應該會收到歡迎訊息和選單
- 測試選單按鈕是否正確導向到您的網站

### 2. 測試 Line Login
- 在 Line Bot 中點擊 "🚀 開始遊戲" 按鈕
- 應該會導向到 Line Login 頁面
- 授權後應該會回到您的網站並顯示登入成功

### 3. 檢查功能
- 確認網站能夠獲取 Line 用戶資料
- 測試各個遊戲功能頁面

---

## 故障排除

### 常見問題：

1. **Line Bot 沒有回應**
   - 檢查 Webhook URL 是否正確
   - 確認環境變數 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_CHANNEL_SECRET` 已設置
   - 查看 Vercel Functions 日誌

2. **Line Login 失敗**
   - 確認 Callback URL 完全正確：`https://wedding-game-app.vercel.app/auth/line`
   - 檢查 `LINE_LOGIN_CHANNEL_ID` 和 `LINE_LOGIN_CHANNEL_SECRET` 環境變數
   - 確認 `NEXT_PUBLIC_APP_URL` 設置正確

3. **網站顯示 "載入中..."**
   - 這通常表示缺少必要的環境變數
   - 檢查所有環境變數是否已正確設置
   - 重新部署應用程式

### 檢查方法：
- **Vercel Functions 日誌**：在 Vercel 專案的 "Functions" 標籤查看錯誤
- **Line Webhook 狀態**：在 Line Developers Console 檢查 webhook 狀態
- **瀏覽器開發者工具**：查看 Network 和 Console 錯誤

---

## 🎉 完成！

設置完成後，您的婚禮互動遊戲將具備：

✅ **Line Bot 選單**：賓客可以透過 Line Bot 訪問所有功能
✅ **Line Login**：自動獲取賓客的 Line 名稱和頭像
✅ **無縫整合**：從 Line 直接進入遊戲，無需額外註冊

### 使用流程：
1. 賓客加入 Line Bot 好友
2. 點擊選單中的功能按鈕
3. 首次使用時透過 Line Login 授權
4. 開始參與婚禮互動遊戲！

---

## 📞 需要協助？

如果遇到任何問題，請檢查：
1. Line Developers Console 中的設置
2. Vercel 中的環境變數
3. 應用程式的部署狀態

所有 URL 都應該使用：`https://wedding-game-app.vercel.app`
