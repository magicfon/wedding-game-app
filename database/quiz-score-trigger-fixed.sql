-- 修復的觸發器腳本：快問快答分數記錄在 quiz_score
-- 請在 Supabase SQL Editor 中執行

-- 1. 刪除舊的觸發器和函數
DROP TRIGGER IF EXISTS trigger_update_user_total_score ON answer_records;
DROP FUNCTION IF EXISTS update_user_total_score();

-- 2. 創建新的觸發器函數：更新 quiz_score
CREATE OR REPLACE FUNCTION update_user_quiz_score()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
    old_quiz_score INTEGER;
    new_quiz_score INTEGER;
BEGIN
    -- 獲取用戶資訊用於日誌
    SELECT display_name, quiz_score INTO user_display_name, old_quiz_score
    FROM users 
    WHERE line_id = COALESCE(NEW.user_line_id, OLD.user_line_id);
    
    IF TG_OP = 'INSERT' THEN
        -- 新增答題記錄時，增加快問快答分數
        UPDATE users 
        SET quiz_score = quiz_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        
        -- 獲取更新後的分數
        SELECT quiz_score INTO new_quiz_score
        FROM users WHERE line_id = NEW.user_line_id;
        
        -- 記錄日誌
        RAISE NOTICE '[快問快答觸發器] INSERT: 用戶 % (%) 答題獲得 % 分，快問快答分數 % → %', 
                     user_display_name, NEW.user_line_id, NEW.earned_score, old_quiz_score, new_quiz_score;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新答題記錄時，調整分數差額
        UPDATE users 
        SET quiz_score = quiz_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        
        -- 獲取更新後的分數
        SELECT quiz_score INTO new_quiz_score
        FROM users WHERE line_id = NEW.user_line_id;
        
        -- 記錄日誌
        RAISE NOTICE '[快問快答觸發器] UPDATE: 用戶 % (%) 分數調整 %-%+%= %, 快問快答分數 % → %', 
                     user_display_name, NEW.user_line_id, OLD.earned_score, NEW.earned_score, 
                     (NEW.earned_score - OLD.earned_score), old_quiz_score, new_quiz_score;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- 刪除答題記錄時，減少分數
        UPDATE users 
        SET quiz_score = quiz_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        
        -- 獲取更新後的分數
        SELECT quiz_score INTO new_quiz_score
        FROM users WHERE line_id = OLD.user_line_id;
        
        -- 記錄日誌
        RAISE NOTICE '[快問快答觸發器] DELETE: 用戶 % (%) 刪除答題記錄扣除 % 分，快問快答分數 % → %', 
                     user_display_name, OLD.user_line_id, OLD.earned_score, old_quiz_score, new_quiz_score;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. 創建新觸發器：更新快問快答分數
CREATE TRIGGER trigger_update_user_quiz_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_quiz_score();

-- 4. 將現有的 total_score 數據遷移到 quiz_score
UPDATE users 
SET quiz_score = COALESCE(
    (SELECT SUM(earned_score) 
     FROM answer_records 
     WHERE user_line_id = users.line_id), 
    0
);

-- 5. 重置 total_score 為 0（為其他遊戲保留）
UPDATE users SET total_score = 0;

-- 6. 確認觸發器已創建
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    '✅ 快問快答觸發器已創建' as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_user_quiz_score';

-- 7. 顯示當前用戶快問快答分數狀態
SELECT 
    u.display_name as "用戶名稱",
    u.quiz_score as "快問快答分數",
    u.total_score as "總分數",
    COALESCE(SUM(ar.earned_score), 0) as "計算快問快答分數",
    COUNT(ar.id) as "答題次數",
    CASE 
        WHEN u.quiz_score = COALESCE(SUM(ar.earned_score), 0) THEN '✅ 分數正確'
        ELSE '❌ 分數不一致'
    END as "狀態"
FROM users u
LEFT JOIN answer_records ar ON u.line_id = ar.user_line_id
GROUP BY u.line_id, u.display_name, u.quiz_score, u.total_score
ORDER BY u.quiz_score DESC;
