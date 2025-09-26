-- 檢查實時更新和觸發器狀態
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查觸發器是否存在
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    '✅ 觸發器存在' as status
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_update_user_quiz_score', 'trigger_update_user_total_score')
ORDER BY trigger_name;

-- 2. 檢查觸發器函數是否存在
SELECT 
    routine_name,
    routine_type,
    data_type,
    '✅ 函數存在' as status
FROM information_schema.routines 
WHERE routine_name IN ('update_user_quiz_score', 'update_user_total_score')
ORDER BY routine_name;

-- 3. 檢查實時發布狀態 (Realtime)
SELECT 
    schemaname,
    tablename,
    '📡 實時發布狀態' as status
FROM pg_publication_tables 
WHERE tablename IN ('users', 'answer_records');

-- 4. 檢查最近的答題記錄
SELECT 
    ar.id,
    ar.user_line_id,
    u.display_name,
    ar.earned_score,
    ar.created_at,
    u.quiz_score as current_quiz_score,
    '📝 最近答題記錄' as status
FROM answer_records ar
LEFT JOIN users u ON ar.user_line_id = u.line_id
ORDER BY ar.created_at DESC
LIMIT 10;

-- 5. 檢查分數一致性
SELECT 
    u.display_name,
    u.quiz_score as current_quiz_score,
    COALESCE(SUM(ar.earned_score), 0) as calculated_score,
    CASE 
        WHEN u.quiz_score = COALESCE(SUM(ar.earned_score), 0) THEN '✅ 一致'
        ELSE '❌ 不一致'
    END as consistency_status,
    COUNT(ar.id) as answer_count
FROM users u
LEFT JOIN answer_records ar ON u.line_id = ar.user_line_id
GROUP BY u.line_id, u.display_name, u.quiz_score
HAVING u.quiz_score > 0 OR COUNT(ar.id) > 0
ORDER BY u.quiz_score DESC;

-- 6. 檢查資料庫連接和權限
SELECT 
    current_user as db_user,
    current_database() as db_name,
    version() as db_version,
    '🔗 資料庫連接狀態' as status;

-- 7. 建議的修復命令（如果觸發器不存在）
-- 如果上面的檢查顯示觸發器不存在，執行以下命令：

/*
-- 重新創建觸發器
CREATE OR REPLACE FUNCTION update_user_quiz_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET quiz_score = quiz_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE users SET quiz_score = quiz_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET quiz_score = quiz_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_quiz_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_quiz_score();
*/
