-- 簡化版本的觸發器修復腳本
-- 請在 Supabase SQL Editor 中執行

-- 1. 刪除舊的觸發器
DROP TRIGGER IF EXISTS trigger_update_user_total_score ON answer_records;

-- 2. 刪除舊的函數
DROP FUNCTION IF EXISTS update_user_total_score();

-- 3. 創建新的觸發器函數
CREATE OR REPLACE FUNCTION update_user_total_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 新增答題記錄時，增加分數
        UPDATE users 
        SET total_score = total_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新答題記錄時，調整分數差額
        UPDATE users 
        SET total_score = total_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- 刪除答題記錄時，減少分數
        UPDATE users 
        SET total_score = total_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. 創建新的觸發器
CREATE TRIGGER trigger_update_user_total_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_total_score();

-- 5. 手動重新計算所有用戶的分數（確保一致性）
UPDATE users 
SET total_score = COALESCE(
    (SELECT SUM(earned_score) 
     FROM answer_records 
     WHERE user_line_id = users.line_id), 
    0
);

-- 6. 顯示修復結果
SELECT 
    u.display_name,
    u.total_score as current_score,
    COALESCE(SUM(ar.earned_score), 0) as calculated_score,
    CASE 
        WHEN u.total_score = COALESCE(SUM(ar.earned_score), 0) THEN '✅ 一致'
        ELSE '❌ 不一致'
    END as status
FROM users u
LEFT JOIN answer_records ar ON u.line_id = ar.user_line_id
GROUP BY u.line_id, u.display_name, u.total_score
ORDER BY u.total_score DESC;
