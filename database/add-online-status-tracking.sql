-- 添加用戶在線狀態追蹤欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 添加在線狀態追蹤欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_in_quiz_page BOOLEAN DEFAULT FALSE;

-- 2. 更新現有用戶的預設值
UPDATE users 
SET 
    last_active_at = COALESCE(last_active_at, NOW()),
    is_in_quiz_page = COALESCE(is_in_quiz_page, FALSE)
WHERE 
    last_active_at IS NULL 
    OR is_in_quiz_page IS NULL;

-- 3. 創建清理過期在線狀態的函數
CREATE OR REPLACE FUNCTION cleanup_expired_online_status()
RETURNS void AS $$
BEGIN
    -- 將超過5分鐘沒有心跳的用戶標記為離線
    UPDATE users 
    SET is_in_quiz_page = FALSE
    WHERE is_in_quiz_page = TRUE 
    AND last_active_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- 4. 創建定期清理任務（可選，需要 pg_cron 擴展）
-- 如果有 pg_cron 擴展，可以取消註解以下行：
-- SELECT cron.schedule('cleanup-expired-online-status', '*/5 * * * *', 'SELECT cleanup_expired_online_status();');

-- 5. 創建查詢當前在線用戶的視圖
CREATE OR REPLACE VIEW current_online_users AS
SELECT 
    line_id,
    display_name,
    avatar_url,
    last_active_at,
    is_in_quiz_page,
    EXTRACT(EPOCH FROM (NOW() - last_active_at)) AS seconds_since_last_active
FROM users 
WHERE is_in_quiz_page = TRUE 
AND last_active_at > NOW() - INTERVAL '2 minutes'
ORDER BY last_active_at DESC;

-- 6. 設置 RLS 政策（如果需要）
DROP POLICY IF EXISTS "允許查詢在線用戶" ON users;
CREATE POLICY "允許查詢在線用戶" ON users FOR SELECT USING (true);
