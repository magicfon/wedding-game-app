# ⚡ Line 快速設置清單

**您的域名**: https://wedding-game-app.vercel.app

## 📋 設置清單

### Line Developers Console 設置
- [ ] 前往 [developers.line.biz](https://developers.line.biz)
- [ ] 創建 Provider：`婚禮遊戲`

#### Line Login Channel
- [ ] 創建 "LINE Login" Channel
- [ ] 設置 Callback URL: `https://wedding-game-app.vercel.app/auth/line`
- [ ] 複製 Channel ID 和 Channel Secret

#### Line Bot (Messaging API) Channel  
- [ ] 創建 "Messaging API" Channel
- [ ] 設置 Webhook URL: `https://wedding-game-app.vercel.app/api/line/webhook`
- [ ] 開啟 "Use webhook" ✅
- [ ] 關閉 "Auto-reply messages" ❌
- [ ] 複製 Channel Access Token 和 Channel Secret

### Vercel 環境變數設置
前往 [vercel.com](https://vercel.com) > 您的專案 > Settings > Environment Variables

- [ ] `LINE_LOGIN_CHANNEL_ID` = Line Login 的 Channel ID
- [ ] `LINE_LOGIN_CHANNEL_SECRET` = Line Login 的 Channel Secret  
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` = Messaging API 的 Channel Access Token
- [ ] `LINE_CHANNEL_SECRET` = Messaging API 的 Channel Secret
- [ ] `NEXT_PUBLIC_APP_URL` = `https://wedding-game-app.vercel.app`
- [ ] `ADMIN_PASSWORD` = `admin123` (或您自定義的密碼)
- [ ] `NEXTAUTH_SECRET` = 任意隨機字串

### 部署和測試
- [ ] 在 Vercel 重新部署應用程式
- [ ] 用手機加入 Line Bot 好友
- [ ] 測試 Bot 選單功能
- [ ] 測試 Line Login 流程

---

## 🚨 重要提醒

### 必須使用的 URL：
- **Callback URL**: `https://wedding-game-app.vercel.app/auth/line`
- **Webhook URL**: `https://wedding-game-app.vercel.app/api/line/webhook`

### 測試步驟：
1. **Line Bot 測試**：發送訊息給 Bot，應該收到選單回覆
2. **Line Login 測試**：點擊 "🚀 開始遊戲" 按鈕，完成授權流程
3. **功能測試**：確認所有遊戲功能正常運作

---

## 📞 如果遇到問題

### 檢查項目：
1. **環境變數**：確認所有變數都已正確設置
2. **URL 正確性**：確認 Callback 和 Webhook URL 完全正確
3. **重新部署**：設置環境變數後必須重新部署
4. **權限設置**：確認 Line Channel 的權限設置正確

### 常見錯誤：
- ❌ URL 末尾多了斜線
- ❌ 環境變數名稱拼寫錯誤  
- ❌ 忘記重新部署
- ❌ Channel ID 和 Secret 搞混

設置完成後，您的婚禮遊戲就能完美整合 Line 功能了！🎉
