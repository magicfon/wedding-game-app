-- 簡單直接的 display_order 欄位添加腳本
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 添加 display_order 欄位（如果不存在）
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. 為現有題目設定初始排序（依照 ID 順序）
UPDATE questions 
SET display_order = id 
WHERE display_order = 0 OR display_order IS NULL;

-- 3. 添加索引以提升排序查詢效能
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);

-- 4. 檢查結果
SELECT 
    id,
    question_text,
    display_order,
    '✅ 排序已設定' as status
FROM questions 
ORDER BY display_order, id
LIMIT 10;

-- 5. 統計排序狀態
SELECT 
    COUNT(*) as 總題目數,
    COUNT(CASE WHEN display_order > 0 THEN 1 END) as 已設定排序,
    MIN(display_order) as 最小排序,
    MAX(display_order) as 最大排序
FROM questions;

-- 完成！現在可以使用拖拽排序功能了
