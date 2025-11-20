-- 修復快問快答分數一致性問題
-- 請在 Supabase SQL Editor 中執行

-- 1. 確保 users 表有 quiz_score 欄位
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'quiz_score') THEN
        ALTER TABLE users ADD COLUMN quiz_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. 重新應用正確的觸發器邏輯 (確保使用 quiz_score)
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
        RAISE NOTICE '[快問快答觸發器] UPDATE: 用戶 % (%) 分數調整: 舊% -> 新% (變動%), 快問快答分數 % → %', 
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

-- 3. 刪除舊觸發器並創建新觸發器
DROP TRIGGER IF EXISTS trigger_update_user_quiz_score ON answer_records;
CREATE TRIGGER trigger_update_user_quiz_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_quiz_score();

-- 4. 強制同步分數：根據 answer_records 重新計算所有用戶的 quiz_score
UPDATE users 
SET quiz_score = COALESCE(
    (SELECT SUM(earned_score) 
     FROM answer_records 
     WHERE user_line_id = users.line_id), 
    0
);

-- 5. 驗證結果
SELECT 
    u.display_name as "用戶名稱",
    u.quiz_score as "快問快答分數",
    COALESCE(SUM(ar.earned_score), 0) as "計算快問快答分數",
    CASE 
        WHEN u.quiz_score = COALESCE(SUM(ar.earned_score), 0) THEN '✅ 分數正確'
        ELSE '❌ 分數不一致'
    END as "狀態"
FROM users u
LEFT JOIN answer_records ar ON u.line_id = ar.user_line_id
GROUP BY u.line_id, u.display_name, u.quiz_score
ORDER BY u.quiz_score DESC;
