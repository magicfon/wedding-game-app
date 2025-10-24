-- 為現有照片生成縮圖的遷移腳本
-- 這個腳本創建必要的表和函數來支援批量遷移舊照片

-- 1. 標記所有沒有縮圖的照片
CREATE TEMPORARY TABLE photos_without_thumbnails AS
SELECT id, image_url, user_id, created_at
FROM photos
WHERE has_thumbnail = FALSE OR has_thumbnail IS NULL;

-- 2. 創建遷移記錄表
CREATE TABLE IF NOT EXISTS photo_thumbnail_migration (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER REFERENCES photos(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 插入需要遷移的照片記錄
INSERT INTO photo_thumbnail_migration (photo_id)
SELECT id FROM photos_without_thumbnails
ON CONFLICT DO NOTHING;

-- 4. 創建遷移狀態查詢函數
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE(
  total_photos BIGINT,
  pending_migration BIGINT,
  processing_migration BIGINT,
  completed_migration BIGINT,
  failed_migration BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_photos,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_migration,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT as processing_migration,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_migration,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_migration
  FROM photo_thumbnail_migration;
END;
$$ LANGUAGE plpgsql;

-- 5. 創建獲取下一批待處理照片的函數
CREATE OR REPLACE FUNCTION get_next_migration_batch(batch_size INTEGER DEFAULT 10)
RETURNS TABLE(
  photo_id INTEGER,
  image_url TEXT,
  user_id TEXT,
  migration_id INTEGER
) AS $$
BEGIN
  -- 更新一批記錄為處理中狀態
  UPDATE photo_thumbnail_migration
  SET status = 'processing', updated_at = NOW()
  WHERE id IN (
    SELECT id FROM photo_thumbnail_migration
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT batch_size
  )
  RETURNING photo_id;
  
  -- 返回這批照片的信息
  RETURN QUERY
  SELECT 
    p.id as photo_id,
    p.image_url,
    p.user_id,
    m.id as migration_id
  FROM photos p
  JOIN photo_thumbnail_migration m ON p.id = m.photo_id
  WHERE m.status = 'processing'
  ORDER BY m.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 6. 創建更新遷移狀態的函數
CREATE OR REPLACE FUNCTION update_migration_status(
  migration_id INTEGER,
  new_status VARCHAR(20),
  thumbnail_url TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 更新遷移狀態
  UPDATE photo_thumbnail_migration
  SET 
    status = new_status,
    updated_at = NOW(),
    error_message = CASE 
      WHEN new_status = 'failed' THEN error_message
      ELSE NULL
    END
  WHERE id = migration_id;
  
  -- 如果成功，更新照片記錄
  IF new_status = 'completed' AND thumbnail_url IS NOT NULL THEN
    UPDATE photos
    SET 
      thumbnail_url = thumbnail_url,
      has_thumbnail = TRUE,
      updated_at = NOW()
    WHERE id = (SELECT photo_id FROM photo_thumbnail_migration WHERE id = migration_id);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. 創建清理遷移記錄的函數（成功遷移30天後清理）
CREATE OR REPLACE FUNCTION cleanup_migration_records()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM photo_thumbnail_migration
  WHERE status = 'completed' 
  AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 創建重置失敗遷移的函數
CREATE OR REPLACE FUNCTION reset_failed_migrations()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE photo_thumbnail_migration
  SET status = 'pending', updated_at = NOW(), error_message = NULL
  WHERE status = 'failed';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 創建獲取遷移統計信息的函數
CREATE OR REPLACE FUNCTION get_migration_stats()
RETURNS TABLE(
  total_photos_without_thumbnails BIGINT,
  photos_with_thumbnails BIGINT,
  migration_progress_percentage NUMERIC,
  estimated_remaining_time INTERVAL
) AS $$
DECLARE
  total_without_thumb BIGINT;
  with_thumb BIGINT;
  completed BIGINT;
  pending BIGINT;
  avg_time_per_photo INTERVAL := INTERVAL '5 seconds'; -- 假設每張照片平均5秒
BEGIN
  -- 統計照片數量
  SELECT COUNT(*) INTO total_without_thumb
  FROM photos 
  WHERE has_thumbnail = FALSE OR has_thumbnail IS NULL;
  
  SELECT COUNT(*) INTO with_thumb
  FROM photos 
  WHERE has_thumbnail = TRUE;
  
  -- 統計遷移進度
  SELECT COUNT(*) FILTER (WHERE status = 'completed') INTO completed
  FROM photo_thumbnail_migration;
  
  SELECT COUNT(*) FILTER (WHERE status = 'pending') INTO pending
  FROM photo_thumbnail_migration;
  
  -- 計算進度百分比
  RETURN QUERY
  SELECT 
    total_without_thumb,
    with_thumb,
    CASE 
      WHEN total_without_thumb > 0 THEN 
        ROUND((completed::NUMERIC / (completed + pending)::NUMERIC) * 100, 2)
      ELSE 0
    END as migration_progress_percentage,
    pending * avg_time_per_photo as estimated_remaining_time;
END;
$$ LANGUAGE plpgsql;

-- 初始查詢遷移狀態
SELECT * FROM get_migration_status();

-- 查詢遷移統計信息
SELECT * FROM get_migration_stats();

-- 顯示需要遷移的照片數量
SELECT 
  '需要遷移的照片數量' as "統計項",
  COUNT(*)::TEXT as "數量"
FROM photos 
WHERE has_thumbnail = FALSE OR has_thumbnail IS NULL

UNION ALL

SELECT 
  '已有縮圖的照片數量',
  COUNT(*)::TEXT
FROM photos 
WHERE has_thumbnail = TRUE

UNION ALL

SELECT 
  '總照片數量',
  COUNT(*)::TEXT
FROM photos;