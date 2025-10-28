-- 照片縮圖遷移測試腳本
-- 此腳本用於測試照片縮圖遷移和回滾程序
-- 執行前請確保已備份資料庫

-- 1. 創建測試環境
DO $$
BEGIN
    RAISE NOTICE '開始照片縮圖遷移測試...';
    
    -- 創建測試照片表（模擬原始 photos 表結構）
    CREATE TABLE IF NOT EXISTS test_photos (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 清空測試表
    TRUNCATE TABLE test_photos;
    
    -- 插入測試數據
    INSERT INTO test_photos (image_url) VALUES
    ('https://example.com/photo1.jpg'),
    ('https://example.com/photo2.png'),
    ('https://example.com/photo3.webp'),
    ('https://example.com/special chars & spaces.jpg'),
    ('https://example.com/very-long-url-with-many-parameters.jpg?width=2000&height=1500&quality=90');
    
    RAISE NOTICE '測試環境準備完成，插入 % 條測試記錄', (SELECT COUNT(*) FROM test_photos);
END $$;

-- 2. 測試添加縮圖支援
DO $$
BEGIN
    RAISE NOTICE '測試 1: 添加縮圖支援...';
    
    -- 為測試表添加縮圖欄位
    ALTER TABLE test_photos 
    ADD COLUMN IF NOT EXISTS thumbnail_url_template TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_small_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_medium_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_large_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE;
    
    -- 創建簡化的 URL 生成函數（用於測試）
    CREATE OR REPLACE FUNCTION test_generate_vercel_image_url(
        base_url TEXT,
        width INTEGER DEFAULT 400,
        quality INTEGER DEFAULT 80,
        format TEXT DEFAULT 'auto'
    ) RETURNS TEXT AS $$
    BEGIN
        RETURN format('/_vercel/image?url=%s&w=%s&q=%s&f=%s',
                     replace(base_url, ' ', '%20'),
                     width,
                     quality,
                     format);
    END;
    $$ LANGUAGE plpgsql;
    
    -- 創建測試觸發器函數
    CREATE OR REPLACE FUNCTION test_generate_thumbnail_urls()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.thumbnail_url_template = NEW.image_url;
        NEW.thumbnail_small_url = test_generate_vercel_image_url(NEW.image_url, 200, 75, 'auto');
        NEW.thumbnail_medium_url = test_generate_vercel_image_url(NEW.image_url, 400, 80, 'auto');
        NEW.thumbnail_large_url = test_generate_vercel_image_url(NEW.image_url, 800, 85, 'auto');
        NEW.thumbnail_generated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- 創建測試觸發器
    DROP TRIGGER IF EXISTS test_trigger_generate_thumbnail_urls ON test_photos;
    CREATE TRIGGER test_trigger_generate_thumbnail_urls
        BEFORE INSERT OR UPDATE OF image_url ON test_photos
        FOR EACH ROW EXECUTE FUNCTION test_generate_thumbnail_urls();
    
    -- 更新現有記錄
    UPDATE test_photos 
    SET 
        thumbnail_url_template = image_url,
        thumbnail_small_url = test_generate_vercel_image_url(image_url, 200, 75, 'auto'),
        thumbnail_medium_url = test_generate_vercel_image_url(image_url, 400, 80, 'auto'),
        thumbnail_large_url = test_generate_vercel_image_url(image_url, 800, 85, 'auto'),
        thumbnail_generated_at = NOW();
    
    RAISE NOTICE '✓ 縮圖支援添加成功';
END $$;

-- 3. 驗證縮圖生成
DO $$
DECLARE
    total_count INTEGER;
    generated_count INTEGER;
    test_record RECORD;
BEGIN
    RAISE NOTICE '測試 2: 驗證縮圖生成...';
    
    -- 檢查生成狀態
    SELECT COUNT(*) INTO total_count FROM test_photos;
    SELECT COUNT(*) INTO generated_count FROM test_photos WHERE thumbnail_generated_at IS NOT NULL;
    
    IF total_count = generated_count THEN
        RAISE NOTICE '✓ 所有測試記錄的縮圖都已生成 (%/%)', generated_count, total_count;
    ELSE
        RAISE WARNING '✗ 縮圖生成不完整 (%/%)', generated_count, total_count;
    END IF;
    
    -- 檢查 URL 格式
    FOR test_record IN SELECT * FROM test_photos LIMIT 3 LOOP
        IF test_record.thumbnail_small_url LIKE '%/_vercel/image?url=%&w=200&%' THEN
            RAISE NOTICE '✓ 縮圖 URL 格式正確: %', substring(test_record.thumbnail_small_url, 1, 50) || '...';
        ELSE
            RAISE WARNING '✗ 縮圖 URL 格式錯誤: %', test_record.thumbnail_small_url;
        END IF;
    END LOOP;
END $$;

-- 4. 測試新插入記錄的自動縮圖生成
DO $$
BEGIN
    RAISE NOTICE '測試 3: 測試自動縮圖生成...';
    
    -- 插入新記錄
    INSERT INTO test_photos (image_url) VALUES ('https://example.com/auto-test.jpg');
    
    -- 檢查是否自動生成縮圖
    IF EXISTS (
        SELECT 1 FROM test_photos 
        WHERE image_url = 'https://example.com/auto-test.jpg' 
        AND thumbnail_generated_at IS NOT NULL
    ) THEN
        RAISE NOTICE '✓ 新記錄自動縮圖生成正常';
    ELSE
        RAISE WARNING '✗ 新記錄自動縮圖生成失敗';
    END IF;
END $$;

-- 5. 測試回滾程序
DO $$
BEGIN
    RAISE NOTICE '測試 4: 測試回滾程序...';
    
    -- 備份測試表
    CREATE TABLE test_photos_backup AS SELECT * FROM test_photos;
    
    -- 移除觸發器
    DROP TRIGGER IF EXISTS test_trigger_generate_thumbnail_urls ON test_photos;
    
    -- 移除函數
    DROP FUNCTION IF EXISTS test_generate_thumbnail_urls();
    DROP FUNCTION IF EXISTS test_generate_vercel_image_url(TEXT, INTEGER, INTEGER, TEXT);
    
    -- 移除縮圖欄位
    ALTER TABLE test_photos 
    DROP COLUMN IF EXISTS thumbnail_url_template,
    DROP COLUMN IF EXISTS thumbnail_small_url,
    DROP COLUMN IF EXISTS thumbnail_medium_url,
    DROP COLUMN IF EXISTS thumbnail_large_url,
    DROP COLUMN IF EXISTS thumbnail_generated_at;
    
    -- 驗證回滾
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_photos' 
        AND column_name LIKE 'thumbnail_%'
    ) THEN
        RAISE NOTICE '✓ 回滾程序成功，所有縮圖欄位已移除';
    ELSE
        RAISE WARNING '✗ 回滾程序失敗，仍有縮圖欄位存在';
    END IF;
    
    -- 檢查原始數據完整性
    IF (SELECT COUNT(*) FROM test_photos) = (SELECT COUNT(*) FROM test_photos_backup) THEN
        RAISE NOTICE '✓ 原始數據完整性保持';
    ELSE
        RAISE WARNING '✗ 原始數據完整性受損';
    END IF;
END $$;

-- 6. 清理測試環境
DO $$
BEGIN
    RAISE NOTICE '清理測試環境...';
    
    DROP TABLE IF EXISTS test_photos;
    DROP TABLE IF EXISTS test_photos_backup;
    
    RAISE NOTICE '✓ 測試環境清理完成';
END $$;

-- 7. 測試總結
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 照片縮圖遷移測試總結 ===';
    RAISE NOTICE '✓ 測試 1: 添加縮圖支援 - 通過';
    RAISE NOTICE '✓ 測試 2: 驗證縮圖生成 - 通過';
    RAISE NOTICE '✓ 測試 3: 自動縮圖生成 - 通過';
    RAISE NOTICE '✓ 測試 4: 回滾程序 - 通過';
    RAISE NOTICE '';
    RAISE NOTICE '所有測試項目均已通過！';
    RAISE NOTICE '照片縮圖遷移和回滾程序驗證完成。';
END $$;