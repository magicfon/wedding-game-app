# 部署指南

## 快速部署到 Vercel

### 1. 準備工作

#### 創建 Supabase 專案
1. 前往 [Supabase](https://supabase.com)
2. 點擊 "New project"
3. 選擇組織並輸入專案名稱
4. 選擇資料庫密碼和地區（建議選擇亞太地區）
5. 等待專案創建完成

#### 設置資料庫
1. 在 Supabase 儀表板中，點擊左側的 "SQL Editor"
2. 複製 `database/schema.sql` 的全部內容
3. 貼上並執行 SQL 腳本
4. 確認所有表格都已創建成功

#### 創建 Storage Bucket
1. 在 Supabase 儀表板中，點擊左側的 "Storage"
2. 點擊 "Create bucket"
3. 輸入名稱：`wedding-photos`
4. 設為 Public bucket
5. 點擊 "Create bucket"

### 2. 獲取 Supabase 金鑰

在 Supabase 專案設定中獲取以下資訊：
- 前往 Settings > API
- 複製以下值：
  - `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
  - `anon/public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
  - `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

### 3. 部署到 Vercel

#### 方法一：GitHub 連接（推薦）
1. 將代碼推送到 GitHub
2. 前往 [Vercel](https://vercel.com)
3. 點擊 "New Project"
4. 選擇您的 GitHub 倉庫
5. 點擊 "Deploy"

#### 方法二：Vercel CLI
```bash
npm i -g vercel
vercel
```

### 4. 設置環境變數

在 Vercel 專案設置中添加以下環境變數：

#### 必需的環境變數：
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-admin-password
NEXTAUTH_SECRET=your-random-secret-string
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 可選的 Line 整合變數：
```
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret
LINE_LOGIN_CHANNEL_ID=your-line-login-id
LINE_LOGIN_CHANNEL_SECRET=your-line-login-secret
```

### 5. 重新部署

設置完環境變數後：
1. 在 Vercel 儀表板中點擊 "Deployments"
2. 點擊最新部署旁的三個點
3. 選擇 "Redeploy"

### 6. 測試功能

部署完成後，測試以下功能：
1. 訪問首頁
2. 進入管理員後台 (`/admin`)
3. 測試照片上傳功能
4. 測試快問快答系統

### 故障排除

#### 常見問題：

**1. Supabase 連接失敗**
- 檢查環境變數是否正確設置
- 確認 Supabase URL 和金鑰格式正確

**2. 資料庫錯誤**
- 確認已執行 `database/schema.sql`
- 檢查表格是否正確創建

**3. 照片上傳失敗**
- 確認已創建 `wedding-photos` bucket
- 檢查 bucket 權限設置

**4. 管理員登入失敗**
- 檢查 `ADMIN_PASSWORD` 環境變數
- 確認 `NEXTAUTH_SECRET` 已設置

### 生產環境優化

#### 建議設置：
1. **Supabase**：
   - 啟用 Row Level Security (RLS)
   - 設置適當的資料庫政策
   - 配置備份策略

2. **Vercel**：
   - 設置自定義域名
   - 啟用分析功能
   - 配置 CDN 快取

3. **安全性**：
   - 使用強密碼
   - 定期更新金鑰
   - 監控使用情況

### 成本預估

使用免費方案的限制：
- **Vercel**：100GB 頻寬/月
- **Supabase**：500MB 資料庫 + 1GB 存儲
- 預計可支援 100-200 同時在線用戶

### 支援

如遇問題，請檢查：
1. Vercel 部署日誌
2. Supabase 日誌
3. 瀏覽器開發者工具

---

## 快速啟動清單

- [ ] 創建 Supabase 專案
- [ ] 執行資料庫腳本
- [ ] 創建 Storage bucket
- [ ] 獲取 Supabase 金鑰
- [ ] 部署到 Vercel
- [ ] 設置環境變數
- [ ] 重新部署
- [ ] 測試所有功能
