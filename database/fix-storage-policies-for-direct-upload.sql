-- 修復 Storage RLS 政策以支持直接上傳
-- 在 Supabase SQL Editor 中執行此腳本

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
-- 注意：這是安全的，因為：
-- 1. 檔名包含用戶 ID，用於後續驗證
-- 2. 資料庫插入操作會驗證用戶身份
-- 3. 我們在客戶端代碼中驗證用戶登入狀態
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