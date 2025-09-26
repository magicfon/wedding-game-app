-- 最終觸發器修復腳本
-- 請在 Supabase SQL Editor 中執行

-- 1. 檢查當前觸發器狀態
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_user_total_score';

-- 2. 刪除舊觸發器和函數
DROP TRIGGER IF EXISTS trigger_update_user_total_score ON answer_records;
DROP FUNCTION IF EXISTS update_user_total_score();

-- 3. 創建新的觸發器函數（加入日誌）
CREATE OR REPLACE FUNCTION update_user_total_score()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT;
    old_total_score INTEGER;
    new_total_score INTEGER;
BEGIN
    -- 獲取用戶資訊用於日誌
    SELECT display_name, total_score INTO user_display_name, old_total_score
    FROM users 
    WHERE line_id = COALESCE(NEW.user_line_id, OLD.user_line_id);
    
    IF TG_OP = 'INSERT' THEN
        -- 新增答題記錄時，增加分數
        UPDATE users 
        SET total_score = total_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        
        -- 獲取更新後的分數
        SELECT total_score INTO new_total_score
        FROM users WHERE line_id = NEW.user_line_id;
        
        -- 記錄日誌
        RAISE NOTICE '[觸發器] INSERT: 用戶 % (%) 答題獲得 % 分，總分 % → %', 
                     user_display_name, NEW.user_line_id, NEW.earned_score, old_total_score, new_total_score;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新答題記錄時，調整分數差額
        UPDATE users 
        SET total_score = total_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        
        -- 獲取更新後的分數
        SELECT total_score INTO new_total_score
        FROM users WHERE line_id = NEW.user_line_id;
        
        -- 記錄日誌
        RAISE NOTICE '[觸發器] UPDATE: 用戶 % (%) 分數調整 %-%+%= %, 總分 % → %', 
                     user_display_name, NEW.user_line_id, OLD.earned_score, NEW.earned_score, 
                     (NEW.earned_score - OLD.earned_score), old_total_score, new_total_score;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- 刪除答題記錄時，減少分數
        UPDATE users 
        SET total_score = total_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        
        -- 獲取更新後的分數
        SELECT total_score INTO new_total_score
        FROM users WHERE line_id = OLD.user_line_id;
        
        -- 記錄日誌
        RAISE NOTICE '[觸發器] DELETE: 用戶 % (%) 刪除答題記錄扣除 % 分，總分 % → %', 
                     user_display_name, OLD.user_line_id, OLD.earned_score, old_total_score, new_total_score;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. 創建新觸發器
CREATE TRIGGER trigger_update_user_total_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_total_score();

-- 5. 確認觸發器已創建
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    '✅ 觸發器已創建' as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_user_total_score';

-- 6. 測試觸發器（插入測試記錄）
-- 注意：請確保有測試用戶和題目
DO $$
DECLARE
    test_user_id TEXT := 'test_trigger_' || extract(epoch from now())::text;
    test_question_id INTEGER := 1; -- 假設題目 1 存在
    initial_score INTEGER := 0;
    final_score INTEGER;
BEGIN
    -- 創建測試用戶
    INSERT INTO users (line_id, display_name, total_score) 
    VALUES (test_user_id, '觸發器測試用戶', initial_score);
    
    RAISE NOTICE '🧪 開始測試觸發器...';
    
    -- 插入測試答題記錄
    INSERT INTO answer_records (user_line_id, question_id, selected_answer, is_correct, earned_score)
    VALUES (test_user_id, test_question_id, 'A', true, 50);
    
    -- 檢查分數是否更新
    SELECT total_score INTO final_score 
    FROM users WHERE line_id = test_user_id;
    
    IF final_score = initial_score + 50 THEN
        RAISE NOTICE '✅ 觸發器測試成功！分數從 % 更新為 %', initial_score, final_score;
    ELSE
        RAISE NOTICE '❌ 觸發器測試失敗！期望分數 %，實際分數 %', (initial_score + 50), final_score;
    END IF;
    
    -- 清理測試資料
    DELETE FROM answer_records WHERE user_line_id = test_user_id;
    DELETE FROM users WHERE line_id = test_user_id;
    
    RAISE NOTICE '🧹 測試資料已清理';
END $$;

-- 7. 顯示當前用戶分數狀態
SELECT 
    u.display_name as "用戶名稱",
    u.total_score as "當前總分",
    COALESCE(SUM(ar.earned_score), 0) as "計算總分",
    COUNT(ar.id) as "答題次數",
    CASE 
        WHEN u.total_score = COALESCE(SUM(ar.earned_score), 0) THEN '✅ 分數正確'
        ELSE '❌ 分數不一致'
    END as "狀態"
FROM users u
LEFT JOIN answer_records ar ON u.line_id = ar.user_line_id
GROUP BY u.line_id, u.display_name, u.total_score
ORDER BY u.total_score DESC;
