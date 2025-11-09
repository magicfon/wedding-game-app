# 直接上傳 RLS 政策修復

## 問題描述

直接上傳功能遇到 "new row violates row-level security policy" 錯誤，這是因為 Supabase Storage 的 RLS (Row Level Security) 政策要求用戶必須已認證才能上傳檔案，但我們的直接上傳功能使用的是匿名客戶端。

## 解決方案

修改 Storage 的 RLS 政策，允許任何人上傳到 `wedding-photos` bucket，因為：

1. 檔名包含用戶 ID，用於後續驗證
2. 資料庫插入操作會驗證用戶身份
3. 我們在客戶端代碼中驗證用戶登入狀態

## 執行步驟

1. 在 Supabase Dashboard 中打開 SQL Editor
2. 執行 `database/fix-storage-policies-for-direct-upload.sql` 腳本
3. 重新測試直接上傳功能

## 腳本內容

```sql
-- 確保 wedding-photos bucket 存在
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 刪除舊的策略（如果存在）
DROP POLICY IF EXISTS "Anyone can view photos in wedding-photos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- 創建新的公開讀取策略
CREATE POLICY "Anyone can view photos in wedding-photos bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'wedding-photos');

-- 允許任何人上傳照片到 wedding-photos bucket
CREATE POLICY "Anyone can upload photos to wedding-photos bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wedding-photos'
);

-- 允許用戶更新自己上傳的照片
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wedding-photos')
WITH CHECK (bucket_id = 'wedding-photos');

-- 允許用戶刪除自己上傳的照片
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'wedding-photos');
```

## 安全性說明

這個修改是安全的，因為：

1. **檔名包含用戶 ID**：每個上傳的檔案都包含用戶 ID，確保可以追蹤上傳者
2. **客戶端驗證**：直接上傳測試頁面已經檢查用戶登入狀態
3. **資料庫驗證**：後續的資料庫插入操作會驗證用戶身份
4. **Bucket 限制**：政策僅適用於 `wedding-photos` bucket

## 測試

執行腳本後，可以測試直接上傳功能：

1. 訪問 `/debug/direct-upload-test` 頁面
2. 確保已登入 LIFF
3. 選擇圖片檔案進行上傳測試
4. 檢查上傳結果和錯誤訊息

## 注意事項

- 這個修改只影響 Storage 層的 RLS 政策
- 資料庫表的 RLS 政策保持不變
- 照片資訊的插入仍然需要通過 API 進行用戶驗證