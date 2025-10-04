-- 創建照片摸彩系統資料庫表
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 創建抽獎歷史表
CREATE TABLE IF NOT EXISTS lottery_history (
    id SERIAL PRIMARY KEY,
    winner_line_id VARCHAR(255) REFERENCES users(line_id) ON DELETE SET NULL,
    winner_display_name VARCHAR(255) NOT NULL,
    winner_avatar_url TEXT,
    photo_count INTEGER NOT NULL DEFAULT 0,
    draw_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_id VARCHAR(255),
    admin_name VARCHAR(255),
    participants_count INTEGER NOT NULL DEFAULT 0,
    participants_snapshot JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 注意：lottery_history 使用 winner_line_id 沒問題，
-- 因為它只是存儲中獎者資訊，不需要關聯 photos 表

-- 2. 創建抽獎狀態表
CREATE TABLE IF NOT EXISTS lottery_state (
    id SERIAL PRIMARY KEY,
    is_lottery_active BOOLEAN DEFAULT FALSE,
    is_drawing BOOLEAN DEFAULT FALSE,
    current_draw_id INTEGER REFERENCES lottery_history(id) ON DELETE SET NULL,
    draw_started_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 插入初始抽獎狀態（只有一筆記錄）
INSERT INTO lottery_state (is_lottery_active, is_drawing) 
VALUES (FALSE, FALSE) 
ON CONFLICT DO NOTHING;

-- 4. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_lottery_history_draw_time ON lottery_history(draw_time DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_history_winner ON lottery_history(winner_line_id);
CREATE INDEX IF NOT EXISTS idx_lottery_history_admin ON lottery_history(admin_id);

-- 5. 啟用 RLS (Row Level Security)
ALTER TABLE lottery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_state ENABLE ROW LEVEL SECURITY;

-- 6. 創建 RLS 政策

-- 所有人都可以查看抽獎歷史（用於大螢幕顯示）
DROP POLICY IF EXISTS "允許所有人查看抽獎歷史" ON lottery_history;
CREATE POLICY "允許所有人查看抽獎歷史" 
ON lottery_history FOR SELECT 
USING (true);

-- 只有管理員可以新增抽獎記錄
DROP POLICY IF EXISTS "允許管理員新增抽獎記錄" ON lottery_history;
CREATE POLICY "允許管理員新增抽獎記錄" 
ON lottery_history FOR INSERT 
WITH CHECK (true);

-- 只有管理員可以更新抽獎記錄
DROP POLICY IF EXISTS "允許管理員更新抽獎記錄" ON lottery_history;
CREATE POLICY "允許管理員更新抽獎記錄" 
ON lottery_history FOR UPDATE 
USING (true);

-- 所有人都可以查看抽獎狀態
DROP POLICY IF EXISTS "允許所有人查看抽獎狀態" ON lottery_state;
CREATE POLICY "允許所有人查看抽獎狀態" 
ON lottery_state FOR SELECT 
USING (true);

-- 只有管理員可以更新抽獎狀態
DROP POLICY IF EXISTS "允許管理員更新抽獎狀態" ON lottery_state;
CREATE POLICY "允許管理員更新抽獎狀態" 
ON lottery_state FOR UPDATE 
USING (true);

-- 7. 創建查詢符合資格用戶的函數
CREATE OR REPLACE FUNCTION get_lottery_eligible_users()
RETURNS TABLE (
    line_id VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    photo_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.line_id,
        u.display_name,
        u.avatar_url,
        COUNT(p.id) as photo_count
    FROM users u
    INNER JOIN photos p ON u.line_id = p.user_id  -- 使用正確的欄位名稱
    WHERE p.is_public = TRUE
    GROUP BY u.line_id, u.display_name, u.avatar_url
    HAVING COUNT(p.id) >= 1
    ORDER BY u.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 創建通知函數（用於 Supabase Realtime）
CREATE OR REPLACE FUNCTION notify_lottery_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('lottery_change', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 創建觸發器
DROP TRIGGER IF EXISTS lottery_state_change_trigger ON lottery_state;
CREATE TRIGGER lottery_state_change_trigger
    AFTER INSERT OR UPDATE ON lottery_state
    FOR EACH ROW
    EXECUTE FUNCTION notify_lottery_change();

DROP TRIGGER IF EXISTS lottery_history_change_trigger ON lottery_history;
CREATE TRIGGER lottery_history_change_trigger
    AFTER INSERT ON lottery_history
    FOR EACH ROW
    EXECUTE FUNCTION notify_lottery_change();

-- 10. 創建清理函數（可選：清除舊的抽獎記錄）
CREATE OR REPLACE FUNCTION cleanup_old_lottery_history(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM lottery_history 
    WHERE draw_time < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完成！
-- 使用範例：
-- SELECT * FROM get_lottery_eligible_users();  -- 查看符合資格的用戶
-- SELECT cleanup_old_lottery_history(90);      -- 清理 90 天前的抽獎記錄

