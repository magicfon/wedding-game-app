-- 照片縮圖遷移腳本
-- 此腳本用於將現有照片遷移到新的縮圖系統
-- 執行前請確保已備份資料庫

-- 1. 檢查是否已經添加了縮圖欄位
DO $$
BEGIN
    -- 檢查 thumbnail_url_template 欄位是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'photos' AND column_name = 'thumbnail_url_template'
    ) THEN
        RAISE EXCEPTION '縮圖欄位尚未添加，請先執行 add-thumbnail-support.sql';
    END IF;
END $$;

-- 2. 備份現有照片數據（創建臨時表）
CREATE TABLE IF NOT EXISTS photos_backup_thumbnail_migration AS
SELECT * FROM photos;

-- 3. 記錄遷移開始時間
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'running',
    details TEXT
);

INSERT INTO migration_log (migration_name, details) 
VALUES ('photos_to_thumbnails', '開始遷移現有照片到縮圖系統');

-- 4. 批次更新現有照片的縮圖 URL
-- 使用批次處理避免一次性更新太多記錄
DO $$
DECLARE
    batch_size INTEGER := 100;
    offset_val INTEGER := 0;
    total_count INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    -- 獲取需要更新的照片總數
    SELECT COUNT(*) INTO total_count 
    FROM photos 
    WHERE thumbnail_generated_at IS NULL;
    
    RAISE NOTICE '需要更新的照片數量: %', total_count;
    
    -- 批次處理
    WHILE offset_val < total_count LOOP
        -- 更新一個批次
        UPDATE photos 
        SET 
            thumbnail_url_template = image_url,
            thumbnail_small_url = generate_vercel_image_url(image_url, 200, 75, 'auto'),
            thumbnail_medium_url = generate_vercel_image_url(image_url, 400, 80, 'auto'),
            thumbnail_large_url = generate_vercel_image_url(image_url, 800, 85, 'auto'),
            thumbnail_generated_at = NOW()
        WHERE id IN (
            SELECT id FROM photos 
            WHERE thumbnail_generated_at IS NULL 
            ORDER BY created_at DESC
            LIMIT batch_size OFFSET offset_val
        );
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        offset_val := offset_val + batch_size;
        
        RAISE NOTICE '已更新 % 張照片 (進度: %/%)', updated_count, LEAST(offset_val, total_count), total_count;
        
        -- 短暫延遲避免過載
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    -- 更新遷移日誌
    UPDATE migration_log 
    SET completed_at = NOW(), 
        status = 'completed',
        details = format('成功遷移 % 張照片到縮圖系統', total_count)
    WHERE migration_name = 'photos_to_thumbnails' 
    AND completed_at IS NULL;
    
    RAISE NOTICE '遷移完成！共處理 % 張照片', total_count;
END $$;

-- 5. 驗證遷移結果
DO $$
DECLARE
    migrated_count INTEGER;
    failed_count INTEGER;
BEGIN
    -- 檢查已遷移的照片數量
    SELECT COUNT(*) INTO migrated_count 
    FROM photos 
    WHERE thumbnail_generated_at IS NOT NULL;
    
    -- 檢查遷移失敗的照片數量
    SELECT COUNT(*) INTO failed_count 
    FROM photos 
    WHERE thumbnail_generated_at IS NULL;
    
    RAISE NOTICE '遷移驗證結果:';
    RAISE NOTICE '- 成功遷移: % 張照片', migrated_count;
    RAISE NOTICE '- 遷移失敗: % 張照片', failed_count;
    
    IF failed_count > 0 THEN
        RAISE WARNING '有 % 張照片遷移失敗，請檢查日誌', failed_count;
    END IF;
END $$;

-- 6. 創建遷移狀態檢查函數
CREATE OR REPLACE FUNCTION check_thumbnail_migration_status()
RETURNS TABLE(
    total_photos BIGINT,
    migrated_photos BIGINT,
    pending_photos BIGINT,
    migration_percentage NUMERIC,
    last_migration_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_photos,
        COUNT(CASE WHEN thumbnail_generated_at IS NOT NULL THEN 1 END)::BIGINT as migrated_photos,
        COUNT(CASE WHEN thumbnail_generated_at IS NULL THEN 1 END)::BIGINT as pending_photos,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN thumbnail_generated_at IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0 
        END as migration_percentage,
        MAX(thumbnail_generated_at) as last_migration_time
    FROM photos;
END;
$$ LANGUAGE plpgsql;

-- 7. 添加遷移完成標記
CREATE TABLE IF NOT EXISTS migration_status (
    migration_name TEXT PRIMARY KEY,
    completed_at TIMESTAMP WITH TIME ZONE,
    version TEXT DEFAULT '1.0'
);

INSERT INTO migration_status (migration_name, completed_at, version)
VALUES ('photos_to_thumbnails', NOW(), '1.0')
ON CONFLICT (migration_name) DO UPDATE SET
    completed_at = EXCLUDED.completed_at,
    version = EXCLUDED.version;

RAISE NOTICE '照片縮圖遷移腳本執行完成！';