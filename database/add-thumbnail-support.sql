-- 添加縮圖支援到 photos 表
-- 這個腳本為照片表添加縮圖相關欄位

-- 添加縮圖相關欄位
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_file_name TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS has_thumbnail BOOLEAN DEFAULT FALSE;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_width INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

-- 添加索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_photos_has_thumbnail ON photos(has_thumbnail);
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail_url ON photos(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- 添加欄位註釋
COMMENT ON COLUMN photos.thumbnail_url IS '縮圖的公開 URL';
COMMENT ON COLUMN photos.thumbnail_file_name IS '縮圖文件名';
COMMENT ON COLUMN photos.has_thumbnail IS '是否有縮圖標記';
COMMENT ON COLUMN photos.thumbnail_width IS '縮圖寬度（像素）';
COMMENT ON COLUMN photos.thumbnail_height IS '縮圖高度（像素）';

-- 驗證表結構更新
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'photos' 
    AND column_name IN ('thumbnail_url', 'thumbnail_file_name', 'has_thumbnail', 'thumbnail_width', 'thumbnail_height')
ORDER BY column_name;