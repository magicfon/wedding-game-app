-- 確保 wedding-photos bucket 存在
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 刪除舊的策略（如果存在）
DROP POLICY IF EXISTS "Public photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;

-- 創建新的公開讀取策略
CREATE POLICY "Anyone can view photos in wedding-photos bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'wedding-photos');

-- 允許已認證用戶上傳照片
CREATE POLICY "Authenticated users can upload photos"
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

