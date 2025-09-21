# 🚀 快速部署指南

## 方法一：使用 Vercel 網站部署（最簡單）

### 1. 準備 GitHub 倉庫
```bash
# 如果還沒有 GitHub 倉庫，請先創建一個
# 然後推送代碼：
git remote add origin https://github.com/YOUR_USERNAME/wedding-game-app.git
git branch -M main
git push -u origin main
```

### 2. 部署到 Vercel
1. 前往 [vercel.com](https://vercel.com)
2. 使用 GitHub 帳號登入
3. 點擊 "New Project"
4. 選擇您的 `wedding-game-app` 倉庫
5. 點擊 "Deploy"

### 3. 設置環境變數
部署完成後，在 Vercel 儀表板中：
1. 進入您的專案
2. 點擊 "Settings" 標籤
3. 點擊左側的 "Environment Variables"
4. 添加以下變數：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ADMIN_PASSWORD=admin123
NEXTAUTH_SECRET=your-random-secret-string-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 4. 重新部署
設置完環境變數後，點擊 "Deployments" 標籤，然後重新部署。

---

## 方法二：使用 Vercel CLI

### 1. 登入 Vercel
```bash
npx vercel login
```

### 2. 部署
```bash
npx vercel --prod
```

---

## 設置 Supabase（必需）

### 1. 創建 Supabase 專案
1. 前往 [supabase.com](https://supabase.com)
2. 點擊 "New project"
3. 輸入專案名稱和資料庫密碼
4. 選擇地區（建議選擇亞太地區）

### 2. 設置資料庫
1. 在 Supabase 儀表板中，點擊 "SQL Editor"
2. 複製 `database/schema.sql` 的內容並執行
3. 確認所有表格都已創建

### 3. 創建 Storage Bucket
1. 點擊左側的 "Storage"
2. 點擊 "Create bucket"
3. 名稱：`wedding-photos`
4. 設為 Public
5. 創建

### 4. 獲取 API 金鑰
1. 前往 Settings > API
2. 複製以下值：
   - Project URL
   - anon public key
   - service_role key

---

## 測試部署

部署完成後，您可以：
1. 訪問首頁查看界面
2. 前往 `/admin` 測試管理員登入（密碼：admin123）
3. 測試照片上傳功能
4. 測試快問快答系統

---

## 故障排除

### 常見錯誤：
1. **500 錯誤**：檢查環境變數是否正確設置
2. **資料庫連接失敗**：確認 Supabase 設置正確
3. **照片上傳失敗**：檢查 Storage bucket 是否創建

### 檢查日誌：
- Vercel：在專案儀表板的 "Functions" 標籤查看錯誤日誌
- Supabase：在 "Logs" 部分查看資料庫日誌

---

## 🎉 完成！

部署成功後，您就有一個完整的婚禮互動遊戲系統了！

**專案特色：**
- ✅ 響應式設計，支援手機和電腦
- ✅ 即時互動遊戲系統
- ✅ 照片分享和投票功能
- ✅ 管理員後台控制
- ✅ 安全的認證系統

**下一步：**
1. 自定義管理員密碼
2. 設置 Line Login（可選）
3. 添加更多題目到快問快答
4. 自定義界面顏色和文字
