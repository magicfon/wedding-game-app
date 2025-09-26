-- 修復資料庫觸發器
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 刪除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_user_total_score ON answer_records;
DROP FUNCTION IF EXISTS update_user_total_score();

-- 2. 重新創建用戶總分更新函數
CREATE OR REPLACE FUNCTION update_user_total_score()
RETURNS TRIGGER AS $$
BEGIN
    -- 記錄觸發器執行日誌
    RAISE NOTICE '觸發器執行: 操作=%, 用戶=%, 分數=%', TG_OP, COALESCE(NEW.user_line_id, OLD.user_line_id), COALESCE(NEW.earned_score, OLD.earned_score);
    
    IF TG_OP = 'INSERT' THEN
        -- 新增答題記錄時，增加分數
        UPDATE users 
        SET total_score = total_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        
        RAISE NOTICE '用戶 % 增加 % 分', NEW.user_line_id, NEW.earned_score;
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新答題記錄時，調整分數差額
        UPDATE users 
        SET total_score = total_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        
        RAISE NOTICE '用戶 % 分數調整: -%+%=%', NEW.user_line_id, OLD.earned_score, NEW.earned_score, (NEW.earned_score - OLD.earned_score);
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- 刪除答題記錄時，減少分數
        UPDATE users 
        SET total_score = total_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        
        RAISE NOTICE '用戶 % 減少 % 分', OLD.user_line_id, OLD.earned_score;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. 重新創建觸發器
CREATE TRIGGER trigger_update_user_total_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_total_score();

-- 4. 確保觸發器啟用
ALTER TABLE answer_records ENABLE TRIGGER trigger_update_user_total_score;

-- 5. 測試觸發器（插入一個測試記錄然後刪除）
-- 注意：請確保有一個測試用戶存在
DO $$
DECLARE
    test_user_id TEXT := 'test_trigger_user';
    test_question_id INTEGER := 1;
BEGIN
    -- 確保測試用戶存在
    INSERT INTO users (line_id, display_name) 
    VALUES (test_user_id, '觸發器測試用戶') 
    ON CONFLICT (line_id) DO NOTHING;
    
    -- 插入測試答題記錄
    INSERT INTO answer_records (user_line_id, question_id, selected_answer, is_correct, earned_score)
    VALUES (test_user_id, test_question_id, 'A', true, 100);
    
    -- 檢查分數是否更新
    RAISE NOTICE '測試用戶分數: %', (SELECT total_score FROM users WHERE line_id = test_user_id);
    
    -- 清理測試記錄
    DELETE FROM answer_records WHERE user_line_id = test_user_id AND question_id = test_question_id;
    DELETE FROM users WHERE line_id = test_user_id;
    
    RAISE NOTICE '觸發器測試完成';
END $$;

-- 6. 顯示當前觸發器狀態
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_user_total_score';
