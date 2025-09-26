-- 為題目表新增排序功能
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 新增排序欄位
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. 為現有題目設定初始排序（依照 ID 順序）
UPDATE questions 
SET display_order = id 
WHERE display_order = 0 OR display_order IS NULL;

-- 3. 新增索引以提升排序查詢效能
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);

-- 4. 新增註解
COMMENT ON COLUMN questions.display_order IS '題目顯示順序，數字越小越前面';

-- 5. 檢查結果
SELECT 
    id,
    question_text,
    display_order,
    media_type,
    is_active,
    '✅ 排序已設定' as status
FROM questions 
ORDER BY display_order, id;

-- 6. 統計排序狀態
SELECT 
    COUNT(*) as 總題目數,
    COUNT(CASE WHEN display_order > 0 THEN 1 END) as 已設定排序,
    MIN(display_order) as 最小排序,
    MAX(display_order) as 最大排序,
    COUNT(DISTINCT display_order) as 不重複排序數
FROM questions;

-- 7. 創建自動設定排序的函數（新題目自動排到最後）
CREATE OR REPLACE FUNCTION set_default_question_order()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果沒有設定 display_order，自動設為最大值+1
    IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
        SELECT COALESCE(MAX(display_order), 0) + 1 
        INTO NEW.display_order 
        FROM questions;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 創建觸發器
DROP TRIGGER IF EXISTS trigger_set_default_question_order ON questions;
CREATE TRIGGER trigger_set_default_question_order
    BEFORE INSERT ON questions
    FOR EACH ROW EXECUTE FUNCTION set_default_question_order();

-- 9. 檢查觸發器是否創建成功
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    '✅ 觸發器已創建' as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_set_default_question_order';

-- 10. 測試觸發器（可選）
-- INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, points, time_limit, media_type)
-- VALUES ('測試排序', 'A', 'B', 'C', 'D', 'A', 10, 30, 'text');

-- 檢查測試結果
-- SELECT id, question_text, display_order FROM questions ORDER BY display_order DESC LIMIT 1;
