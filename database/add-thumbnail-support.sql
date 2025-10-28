-- 添加照片縮圖支援的資料庫遷移腳本
-- 執行日期: 2025-10-28

-- 1. 為 photos 表添加縮圖相關欄位
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS thumbnail_url_template TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_small_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_medium_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_large_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE;

-- 2. 添加索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail_generated_at ON photos(thumbnail_generated_at DESC) WHERE thumbnail_generated_at IS NOT NULL;

-- 3. 創建函數來生成 Vercel Image Optimization URL
CREATE OR REPLACE FUNCTION generate_vercel_image_url(
    base_url TEXT,
    width INTEGER DEFAULT 400,
    quality INTEGER DEFAULT 80,
    format TEXT DEFAULT 'auto'
) RETURNS TEXT AS $$
BEGIN
    -- Vercel Image Optimization URL 格式: /_vercel/image?url=<encoded_url>&w=<width>&q=<quality>&f=<format>
    RETURN format('/_vercel/image?url=%s&w=%s&q=%s&f=%s', 
                 url_encode(base_url), 
                 width, 
                 quality, 
                 format);
END;
$$ LANGUAGE plpgsql;

-- 4. 創建觸發器自動生成縮圖 URL（當照片插入或更新時）
CREATE OR REPLACE FUNCTION generate_thumbnail_urls()
RETURNS TRIGGER AS $$
BEGIN
    -- 生成不同尺寸的縮圖 URL 模板
    NEW.thumbnail_url_template = NEW.image_url;
    NEW.thumbnail_small_url = generate_vercel_image_url(NEW.image_url, 200, 75, 'auto');
    NEW.thumbnail_medium_url = generate_vercel_image_url(NEW.image_url, 400, 80, 'auto');
    NEW.thumbnail_large_url = generate_vercel_image_url(NEW.image_url, 800, 85, 'auto');
    NEW.thumbnail_generated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 創建觸發器
DROP TRIGGER IF EXISTS trigger_generate_thumbnail_urls ON photos;
CREATE TRIGGER trigger_generate_thumbnail_urls
    BEFORE INSERT OR UPDATE OF image_url ON photos
    FOR EACH ROW EXECUTE FUNCTION generate_thumbnail_urls();

-- 6. 為現有照片生成縮圖 URL
UPDATE photos 
SET 
    thumbnail_url_template = image_url,
    thumbnail_small_url = generate_vercel_image_url(image_url, 200, 75, 'auto'),
    thumbnail_medium_url = generate_vercel_image_url(image_url, 400, 80, 'auto'),
    thumbnail_large_url = generate_vercel_image_url(image_url, 800, 85, 'auto'),
    thumbnail_generated_at = NOW()
WHERE thumbnail_generated_at IS NULL;

-- 7. 添加註釋說明
COMMENT ON COLUMN photos.thumbnail_url_template IS '原始圖片 URL，用作縮圖生成基礎';
COMMENT ON COLUMN photos.thumbnail_small_url IS '小尺寸縮圖 URL (200px)';
COMMENT ON COLUMN photos.thumbnail_medium_url IS '中等尺寸縮圖 URL (400px)';
COMMENT ON COLUMN photos.thumbnail_large_url IS '大尺寸縮圖 URL (800px)';
COMMENT ON COLUMN photos.thumbnail_generated_at IS '縮圖生成時間戳';