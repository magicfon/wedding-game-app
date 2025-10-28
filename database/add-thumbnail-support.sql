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
-- 先創建 URL 編碼函數
CREATE OR REPLACE FUNCTION url_encode(text_param TEXT) RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    char_code INTEGER;
    hex_code TEXT;
BEGIN
    FOR i IN 1..length(text_param) LOOP
        char_code := ascii(substring(text_param, i, 1));
        
        IF char_code = 32 THEN -- 空格
            result := result || '%20';
        ELSIF char_code >= 48 AND char_code <= 57 THEN -- 0-9
            result := result || chr(char_code);
        ELSIF char_code >= 65 AND char_code <= 90 THEN -- A-Z
            result := result || chr(char_code);
        ELSIF char_code >= 97 AND char_code <= 122 THEN -- a-z
            result := result || chr(char_code);
        ELSIF char_code IN (45, 95, 46, 126) THEN -- - . _
            result := result || chr(char_code);
        ELSE
            hex_code := upper(to_hex(char_code));
            IF length(hex_code) = 1 THEN
                result := result || '%0' || hex_code;
            ELSE
                result := result || '%' || hex_code;
            END IF;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 創建 to_hex 輔助函數
CREATE OR REPLACE FUNCTION to_hex(dec_num INTEGER) RETURNS TEXT AS $$
BEGIN
    CASE dec_num
        WHEN 0 THEN RETURN '0';
        WHEN 1 THEN RETURN '1';
        WHEN 2 THEN RETURN '2';
        WHEN 3 THEN RETURN '3';
        WHEN 4 THEN RETURN '4';
        WHEN 5 THEN RETURN '5';
        WHEN 6 THEN RETURN '6';
        WHEN 7 THEN RETURN '7';
        WHEN 8 THEN RETURN '8';
        WHEN 9 THEN RETURN '9';
        WHEN 10 THEN RETURN 'A';
        WHEN 11 THEN RETURN 'B';
        WHEN 12 THEN RETURN 'C';
        WHEN 13 THEN RETURN 'D';
        WHEN 14 THEN RETURN 'E';
        WHEN 15 THEN RETURN 'F';
        ELSE RETURN '';
    END CASE;
END;
$$ LANGUAGE plpgsql;

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