# Vercel 環境變數設置指南

## 🚨 緊急修復：新增 SUPABASE_SERVICE_ROLE_KEY

### 問題
新增題目時出現 RLS (Row Level Security) 權限錯誤，需要使用 Supabase 服務密鑰來繞過 RLS 限制。

### 解決方案
在 Vercel 中新增環境變數：

## 📋 需要設置的環境變數

### 1. 登入 Vercel 控制台
```
https://vercel.com/dashboard
```

### 2. 進入您的專案
找到 `wedding-game-app` 專案

### 3. 進入 Settings → Environment Variables

### 4. 新增以下環境變數

#### **SUPABASE_SERVICE_ROLE_KEY** (新增)
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: 從 Supabase 控制台獲取
- **Environment**: Production, Preview, Development (全選)

#### 如何獲取 Supabase Service Role Key:
1. 登入 Supabase 控制台: https://supabase.com/dashboard
2. 選擇您的專案
3. 進入 Settings → API
4. 複製 **"service_role" secret** (不是 anon public)
5. ⚠️ **注意**: 這是機密密鑰，具有完整資料庫權限

### 5. 確認現有環境變數

確保以下環境變數已正確設置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LIFF_ID`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

### 6. 重新部署

設置完成後，Vercel 會自動重新部署。

## 🔄 替代方案：修復 RLS 政策

如果不想使用服務密鑰，也可以執行 `database/fix-rls-for-admin.sql` 來修復 RLS 政策。

## 🧪 測試

設置完成後，回到問題管理頁面測試：
1. 點擊 "新增題目"
2. 填寫表單並提交
3. 應該可以成功儲存

## 🚨 安全注意事項

- Service Role Key 具有完整資料庫權限
- 只在伺服器端 API 中使用
- 不要在前端代碼中暴露
- 定期輪換密鑰
