# 🗄️ Supabase 資料庫設置指南

## 📋 步驟 1：創建 Supabase 專案

1. **前往** [supabase.com](https://supabase.com)
2. **登入或註冊帳號**
3. **點擊 "New Project"**
4. **填入專案資訊**：
   - **Name**: `wedding-game-app`
   - **Database Password**: 設置一個強密碼（請記住！）
   - **Region**: 選擇最近的區域
5. **點擊 "Create new project"**
6. **等待專案建立完成**（約1-2分鐘）

## 🔑 步驟 2：獲取連接資訊

1. **進入專案後，點擊左側的 "Settings"**
2. **點擊 "API"**
3. **複製以下資訊**：
   - **Project URL** (例如：`https://abcdefgh.supabase.co`)
   - **anon public key** (很長的字串，以 `eyJ` 開頭)

## 💾 步驟 3：建立資料庫表格

1. **點擊左側的 "SQL Editor"**
2. **點擊 "New query"**
3. **複製 `database/setup.sql` 的全部內容**
4. **貼上到 SQL 編輯器中**
5. **點擊右下角的 "Run" 按鈕**
6. **確認看到 "Success. No rows returned" 訊息**

## 🌐 步驟 4：在 Vercel 設置環境變數

1. **前往** [vercel.com](https://vercel.com)
2. **進入您的 `wedding-game-app` 專案**
3. **點擊 "Settings" 標籤**
4. **點擊左側的 "Environment Variables"**
5. **添加以下變數**：

```
NEXT_PUBLIC_SUPABASE_URL = 您的 Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = 您的 anon public key
```

6. **點擊 "Save"**

## 🚀 步驟 5：重新部署

1. **前往 Vercel 專案的 "Deployments" 標籤**
2. **點擊最新部署右側的三個點**
3. **選擇 "Redeploy"**
4. **等待重新部署完成**

## ✅ 步驟 6：測試資料庫連接

部署完成後，訪問您的網站並：

1. **通過 LIFF 登入**
2. **查看瀏覽器控制台**
3. **應該看到 "User synced to database" 訊息**

## 🔧 故障排除

### 問題：SQL 執行失敗
- **檢查**：確認複製了完整的 SQL 腳本
- **解決**：重新複製並執行

### 問題：環境變數無效
- **檢查**：URL 和 Key 是否正確複製
- **解決**：重新從 Supabase 複製

### 問題：部署後仍然無法連接
- **檢查**：是否重新部署了應用
- **解決**：手動觸發重新部署

## 📊 驗證資料庫設置

在 Supabase 中，您應該看到以下表格：

- ✅ `users` - 用戶資料
- ✅ `questions` - 問題資料
- ✅ `game_state` - 遊戲狀態
- ✅ `user_answers` - 答題記錄
- ✅ `photos` - 照片資料
- ✅ `photo_votes` - 投票記錄
- ✅ `admins` - 管理員帳號

## 🎮 下一步

資料庫設置完成後，您就可以：

- ✅ **完整的用戶認證**
- ✅ **快問快答遊戲**
- ✅ **照片上傳和投票**
- ✅ **即時排行榜**
- ✅ **管理員後台**

---

**需要幫助？** 請提供錯誤訊息或截圖！
