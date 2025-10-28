-- 添加影像效能日誌支援的資料庫遷移腳本
-- 執行日期: 2025-10-28

-- 1. 創建影像效能日誌表
CREATE TABLE IF NOT EXISTS image_performance_logs (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    load_time DECIMAL(10,3) NOT NULL, -- 載入時間（毫秒）
    thumbnail_size VARCHAR(20), -- small, medium, large
    device_type VARCHAR(20), -- mobile, tablet, desktop
    connection_type VARCHAR(20), -- slow-2g, 2g, 3g, 4g
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    device_pixel_ratio DECIMAL(3,1),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Vercel 特定資料
    vercel_options JSONB, -- 儲存 Vercel Image Optimization 參數
    original_url TEXT, -- 原始圖片 URL
    -- 索引欄位
    created_date DATE DEFAULT (CURRENT_DATE)
);

-- 2. 創建每日影像效能統計表
CREATE TABLE IF NOT EXISTS daily_image_performance_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    thumbnail_size VARCHAR(20),
    device_type VARCHAR(20),
    total_images INTEGER DEFAULT 0,
    successful_loads INTEGER DEFAULT 0,
    failed_loads INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2), -- 成功率百分比
    avg_load_time DECIMAL(10,3), -- 平均載入時間（毫秒）
    median_load_time DECIMAL(10,3), -- 中位數載入時間
    p95_load_time DECIMAL(10,3), -- 95百分位載入時間
    min_load_time DECIMAL(10,3), -- 最快載入時間
    max_load_time DECIMAL(10,3), -- 最慢載入時間
    total_data_transferred BIGINT DEFAULT 0, -- 總傳輸數據量（位元組）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, thumbnail_size, device_type)
);

-- 3. 創建索引以提升查詢效能
-- 主要查詢索引
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_timestamp ON image_performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_created_date ON image_performance_logs(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_thumbnail_size ON image_performance_logs(thumbnail_size);
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_device_type ON image_performance_logs(device_type);
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_success ON image_performance_logs(success);
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_load_time ON image_performance_logs(load_time);

-- 複合索引用於統計查詢
CREATE INDEX IF NOT EXISTS idx_image_performance_logs_stats ON image_performance_logs(created_date, thumbnail_size, device_type, success);

-- 統計表索引
CREATE INDEX IF NOT EXISTS idx_daily_image_performance_stats_date ON daily_image_performance_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_image_performance_stats_thumbnail_size ON daily_image_performance_stats(thumbnail_size);
CREATE INDEX IF NOT EXISTS idx_daily_image_performance_stats_device_type ON daily_image_performance_stats(device_type);

-- 4. 創建更新每日統計的函數
CREATE OR REPLACE FUNCTION update_daily_image_stats(
    p_date DATE,
    p_load_time DECIMAL,
    p_success BOOLEAN,
    p_thumbnail_size VARCHAR(20) DEFAULT NULL,
    p_device_type VARCHAR(20) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    existing_record RECORD;
BEGIN
    -- 檢查是否已有記錄
    SELECT * INTO existing_record 
    FROM daily_image_performance_stats 
    WHERE date = p_date 
    AND (thumbnail_size = p_thumbnail_size OR (thumbnail_size IS NULL AND p_thumbnail_size IS NULL))
    AND (device_type = p_device_type OR (device_type IS NULL AND p_device_type IS NULL));
    
    IF FOUND THEN
        -- 更新現有記錄
        UPDATE daily_image_performance_stats SET
            total_images = total_images + 1,
            successful_loads = successful_loads + CASE WHEN p_success THEN 1 ELSE 0 END,
            failed_loads = failed_loads + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
            success_rate = (successful_loads + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL / (total_images + 1) * 100,
            avg_load_time = (avg_load_time * total_images + p_load_time) / (total_images + 1),
            min_load_time = LEAST(min_load_time, p_load_time),
            max_load_time = GREATEST(max_load_time, p_load_time),
            updated_at = NOW()
        WHERE id = existing_record.id;
    ELSE
        -- 創建新記錄
        INSERT INTO daily_image_performance_stats (
            date, 
            thumbnail_size, 
            device_type,
            total_images, 
            successful_loads, 
            failed_loads, 
            success_rate, 
            avg_load_time,
            min_load_time,
            max_load_time
        ) VALUES (
            p_date,
            p_thumbnail_size,
            p_device_type,
            1,
            CASE WHEN p_success THEN 1 ELSE 0 END,
            CASE WHEN NOT p_success THEN 1 ELSE 0 END,
            CASE WHEN p_success THEN 100 ELSE 0 END,
            p_load_time,
            p_load_time,
            p_load_time
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. 創建計算中位數和 P95 的函數
CREATE OR REPLACE FUNCTION calculate_percentile_stats(p_date DATE)
RETURNS VOID AS $$
DECLARE
    stat_record RECORD;
    median_time DECIMAL;
    p95_time DECIMAL;
BEGIN
    -- 為每個組合計算百分位數
    FOR stat_record IN 
        SELECT DISTINCT thumbnail_size, device_type 
        FROM daily_image_performance_stats 
        WHERE date = p_date
    LOOP
        -- 計算中位數
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY load_time)
        INTO median_time
        FROM image_performance_logs
        WHERE created_date = p_date
        AND (thumbnail_size = stat_record.thumbnail_size OR (thumbnail_size IS NULL AND stat_record.thumbnail_size IS NULL))
        AND (device_type = stat_record.device_type OR (device_type IS NULL AND stat_record.device_type IS NULL))
        AND success = true;
        
        -- 計算 P95
        SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load_time)
        INTO p95_time
        FROM image_performance_logs
        WHERE created_date = p_date
        AND (thumbnail_size = stat_record.thumbnail_size OR (thumbnail_size IS NULL AND stat_record.thumbnail_size IS NULL))
        AND (device_type = stat_record.device_type OR (device_type IS NULL AND stat_record.device_type IS NULL))
        AND success = true;
        
        -- 更新統計記錄
        UPDATE daily_image_performance_stats SET
            median_load_time = median_time,
            p95_load_time = p95_time
        WHERE date = p_date
        AND (thumbnail_size = stat_record.thumbnail_size OR (thumbnail_size IS NULL AND stat_record.thumbnail_size IS NULL))
        AND (device_type = stat_record.device_type OR (device_type IS NULL AND stat_record.device_type IS NULL));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. 創建自動清理舊數據的函數
CREATE OR REPLACE FUNCTION cleanup_old_image_performance_logs(
    days_to_keep INTEGER DEFAULT 90 -- 預設保留 90 天
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 刪除超過指定天數的詳細日誌
    DELETE FROM image_performance_logs
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 保留每日統計數據更長時間（例如 1 年）
    DELETE FROM daily_image_performance_stats
    WHERE date < CURRENT_DATE - INTERVAL '1 year';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 創建獲取效能摘要的函數
CREATE OR REPLACE FUNCTION get_image_performance_summary(
    p_days INTEGER DEFAULT 7,
    p_thumbnail_size VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    date DATE,
    thumbnail_size VARCHAR(20),
    total_images BIGINT,
    success_rate DECIMAL(5,2),
    avg_load_time DECIMAL(10,3),
    p95_load_time DECIMAL(10,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dps.date,
        dps.thumbnail_size,
        dps.total_images,
        dps.success_rate,
        dps.avg_load_time,
        dps.p95_load_time
    FROM daily_image_performance_stats dps
    WHERE dps.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
    AND (p_thumbnail_size IS NULL OR dps.thumbnail_size = p_thumbnail_size)
    ORDER BY dps.date DESC, dps.thumbnail_size;
END;
$$ LANGUAGE plpgsql;

-- 8. 添加註釋說明
COMMENT ON TABLE image_performance_logs IS '影像載入效能詳細日誌';
COMMENT ON TABLE daily_image_performance_stats IS '影像載入效能每日統計';
COMMENT ON COLUMN image_performance_logs.load_time IS '影像載入時間（毫秒）';
COMMENT ON COLUMN image_performance_logs.thumbnail_size IS '縮圖尺寸：small, medium, large';
COMMENT ON COLUMN image_performance_logs.device_type IS '設備類型：mobile, tablet, desktop';
COMMENT ON COLUMN image_performance_logs.connection_type IS '網路連接類型：slow-2g, 2g, 3g, 4g';
COMMENT ON COLUMN daily_image_performance_stats.success_rate IS '成功率百分比';
COMMENT ON COLUMN daily_image_performance_stats.avg_load_time IS '平均載入時間（毫秒）';
COMMENT ON COLUMN daily_image_performance_stats.median_load_time IS '中位數載入時間（毫秒）';
COMMENT ON COLUMN daily_image_performance_stats.p95_load_time IS '95百分位載入時間（毫秒）';

-- 9. 創建定期維護任務（需要 pg_cron 擴展）
-- 注意：這需要安裝 pg_cron 擴展
-- SELECT cron.schedule('cleanup-image-performance-logs', '0 2 * * *', 'SELECT cleanup_old_image_performance_logs(90);');
-- SELECT cron.schedule('calculate-percentile-stats', '0 1 * * *', 'SELECT calculate_percentile_stats(CURRENT_DATE - 1);');

RAISE NOTICE '影像效能日誌支援已成功添加';