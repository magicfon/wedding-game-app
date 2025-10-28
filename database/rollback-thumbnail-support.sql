-- 照片縮圖支援回滾腳本
-- 此腳本用於回滾照片縮圖功能，恢復到原始狀態
-- 執行前請確保已備份資料庫

-- 1. 安全檢查 - 確認用戶意圖
DO $$
BEGIN
    RAISE NOTICE '警告：此腳本將移除照片縮圖支援！';
    RAISE NOTICE '執行前請確保已備份資料庫。';
    RAISE NOTICE '如果確定要繼續，請在 10 秒內重新執行此腳本。';
    RAISE EXCEPTION '安全檢查：請確認您要執行回滾操作';
END $$;

-- 2. 記錄回滾開始時間
INSERT INTO migration_log (migration_name, details) 
VALUES ('rollback_thumbnail_support', '開始回滾照片縮圖支援')
ON CONFLICT DO NOTHING;

-- 3. 創建回滾前的最終備份
CREATE TABLE IF NOT EXISTS photos_rollback_backup AS
SELECT * FROM photos;

-- 4. 移除觸發器
DROP TRIGGER IF EXISTS trigger_generate_thumbnail_urls ON photos;

-- 5. 移除相關函數
DROP FUNCTION IF EXISTS generate_thumbnail_urls();
DROP FUNCTION IF EXISTS generate_vercel_image_url(TEXT, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS url_encode(TEXT);
DROP FUNCTION IF EXISTS to_hex(INTEGER);
DROP FUNCTION IF EXISTS check_thumbnail_migration_status();

-- 6. 移除索引
DROP INDEX IF EXISTS idx_photos_thumbnail_generated_at;

-- 7. 移除縮圖相關欄位
-- 注意：這會永久刪除所有縮圖數據
ALTER TABLE photos 
DROP COLUMN IF EXISTS thumbnail_url_template,
DROP COLUMN IF EXISTS thumbnail_small_url,
DROP COLUMN IF EXISTS thumbnail_medium_url,
DROP COLUMN IF EXISTS thumbnail_large_url,
DROP COLUMN IF EXISTS thumbnail_generated_at;

-- 8. 清理遷移相關表
DROP TABLE IF EXISTS migration_status;
-- 保留 migration_log 表以供歷史記錄

-- 9. 更新遷移日誌
UPDATE migration_log 
SET completed_at = NOW(), 
    status = 'completed',
    details = '成功回滾照片縮圖支援，已移除所有相關欄位和函數'
WHERE migration_name = 'rollback_thumbnail_support' 
AND completed_at IS NULL;

-- 10. 驗證回滾結果
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    -- 檢查是否還有縮圖相關欄位
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'photos' 
    AND column_name LIKE 'thumbnail_%';
    
    IF column_count = 0 THEN
        RAISE NOTICE '回滾驗證成功：所有縮圖相關欄位已移除';
    ELSE
        RAISE WARNING '回滾驗證失敗：仍有 % 個縮圖相關欄位存在', column_count;
    END IF;
END $$;

-- 11. 創建回滾狀態檢查函數
CREATE OR REPLACE FUNCTION check_rollback_status()
RETURNS TABLE(
    rollback_completed BOOLEAN,
    backup_available BOOLEAN,
    backup_count BIGINT,
    rollback_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'photos' 
            AND column_name LIKE 'thumbnail_%'
        ) as rollback_completed,
        EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'photos_rollback_backup'
        ) as backup_available,
        (SELECT COUNT(*) FROM photos_rollback_backup) as backup_count,
        (SELECT MAX(completed_at) FROM migration_log 
         WHERE migration_name = 'rollback_thumbnail_support') as rollback_time;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '照片縮圖支援回滾腳本執行完成！';
RAISE NOTICE '原始數據已備份到 photos_rollback_backup 表';
RAISE NOTICE '使用 check_rollback_status() 函數檢查回滾狀態';