-- 修復分數調整觸發器：改為更新 quiz_score
-- 請在 Supabase SQL Editor 中執行

-- 0. 確保 score_adjustments 表存在
CREATE TABLE IF NOT EXISTS score_adjustments (
    id SERIAL PRIMARY KEY,
    user_line_id VARCHAR(255) REFERENCES users(line_id),
    admin_id VARCHAR(255) NOT NULL,
    adjustment_score INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. 刪除舊的觸發器函數（如果存在）
DROP TRIGGER IF EXISTS trigger_apply_score_adjustment ON score_adjustments;
DROP FUNCTION IF EXISTS apply_score_adjustment();

-- 2. 創建新的觸發器函數：更新 quiz_score
CREATE OR REPLACE FUNCTION apply_score_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
    old_score INTEGER;
    new_score INTEGER;
BEGIN
    -- 獲取用戶資訊用於日誌
    SELECT display_name, quiz_score INTO user_display_name, old_score
    FROM users 
    WHERE line_id = NEW.user_line_id;

    -- 更新 quiz_score
    UPDATE users 
    SET quiz_score = quiz_score + NEW.adjustment_score 
    WHERE line_id = NEW.user_line_id;
    
    -- 獲取更新後的分數
    SELECT quiz_score INTO new_score
    FROM users WHERE line_id = NEW.user_line_id;
    
    -- 記錄日誌
    RAISE NOTICE '[分數調整觸發器] INSERT: 用戶 % (%) 管理員調整 % 分，快問快答分數 % → %，原因: %', 
                 user_display_name, NEW.user_line_id, NEW.adjustment_score, old_score, new_score, NEW.reason;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 重新創建觸發器
CREATE TRIGGER trigger_apply_score_adjustment
    AFTER INSERT ON score_adjustments
    FOR EACH ROW EXECUTE FUNCTION apply_score_adjustment();

-- 4. 驗證觸發器已創建
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    '✅ 分數調整觸發器已更新' as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_apply_score_adjustment';
