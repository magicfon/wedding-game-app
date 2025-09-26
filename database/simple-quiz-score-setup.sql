-- 簡化版快問快答分數設置腳本
-- 請在 Supabase SQL Editor 中執行

-- 1. 刪除舊觸發器
DROP TRIGGER IF EXISTS trigger_update_user_total_score ON answer_records;
DROP FUNCTION IF EXISTS update_user_total_score();

-- 2. 創建簡化的觸發器函數
CREATE OR REPLACE FUNCTION update_user_quiz_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET quiz_score = quiz_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE users 
        SET quiz_score = quiz_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET quiz_score = quiz_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. 創建觸發器
CREATE TRIGGER trigger_update_user_quiz_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_quiz_score();

-- 4. 遷移現有數據：將 total_score 數據複製到 quiz_score
UPDATE users 
SET quiz_score = COALESCE(
    (SELECT SUM(earned_score) 
     FROM answer_records 
     WHERE user_line_id = users.line_id), 
    0
);

-- 5. 重置 total_score 為 0
UPDATE users SET total_score = 0;

-- 6. 驗證結果
SELECT 
    display_name,
    quiz_score,
    total_score,
    '✅ 設置完成' as status
FROM users
ORDER BY quiz_score DESC;
