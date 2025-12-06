-- 修復縮圖 URL 生成觸發器
-- 問題：觸發器無條件覆蓋縮圖 URL，即使已經提供了正確的縮圖
-- 解決：只在縮圖 URL 為 NULL 時才生成 Vercel 代理 URL

-- 替換原有的 generate_thumbnail_urls 函數
CREATE OR REPLACE FUNCTION generate_thumbnail_urls()
RETURNS TRIGGER AS $$
BEGIN
    -- 只在縮圖 URL 為 NULL 或空字符串時才生成
    -- 這樣可以保留從客戶端上傳的實際縮圖 URL
    
    IF NEW.thumbnail_small_url IS NULL OR NEW.thumbnail_small_url = '' THEN
        NEW.thumbnail_small_url = generate_vercel_image_url(NEW.image_url, 200, 75, 'auto');
    END IF;
    
    IF NEW.thumbnail_medium_url IS NULL OR NEW.thumbnail_medium_url = '' THEN
        NEW.thumbnail_medium_url = generate_vercel_image_url(NEW.image_url, 400, 80, 'auto');
    END IF;
    
    IF NEW.thumbnail_large_url IS NULL OR NEW.thumbnail_large_url = '' THEN
        NEW.thumbnail_large_url = generate_vercel_image_url(NEW.image_url, 800, 85, 'auto');
    END IF;
    
    -- 更新模板和生成時間（如果有變化）
    IF NEW.thumbnail_url_template IS NULL OR NEW.thumbnail_url_template = '' THEN
        NEW.thumbnail_url_template = NEW.image_url;
    END IF;
    
    -- 只在至少有一個縮圖 URL 被更新時才設置生成時間
    IF NEW.thumbnail_generated_at IS NULL THEN
        NEW.thumbnail_generated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 註解：
-- 此修復確保：
-- 1. 影片上傳時，客戶端提供的 .jpg 縮圖 URL 會被保留
-- 2. 圖片上傳時，如果沒有提供縮圖，會自動生成 Vercel 代理 URL
-- 3. 向後兼容：現有的照片仍然可以使用 Vercel Image Optimization
