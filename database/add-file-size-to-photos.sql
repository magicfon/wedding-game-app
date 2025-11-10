-- 為 photos 表新增檔案大小欄位
-- 執行日期: 2024-01-XX
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 新增檔案大小欄位
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT NULL;

-- 2. 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_photos_file_size ON photos(file_size DESC) WHERE file_size IS NOT NULL;

-- 3. 新增註釋說明
COMMENT ON COLUMN photos.file_size IS '照片檔案大小（位元組）';

-- 4. 檢查欄位是否成功新增
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    '✅ 欄位已新增' as status
FROM information_schema.columns 
WHERE table_name = 'photos' 
AND column_name = 'file_size';

-- 5. 統計現有照片的檔案大小狀況
SELECT 
    COUNT(*) as total_photos,
    COUNT(file_size) as photos_with_size,
    COUNT(*) - COUNT(file_size) as photos_without_size
FROM photos;