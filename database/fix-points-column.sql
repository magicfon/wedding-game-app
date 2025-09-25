-- 修復 questions 表格中的分數欄位不一致問題
-- 統一使用 points 作為基礎分數欄位

-- 1. 如果 points 欄位不存在，則創建它
ALTER TABLE questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;

-- 2. 將現有的 base_score 值複製到 points（如果 points 為空或為預設值）
UPDATE questions 
SET points = COALESCE(NULLIF(points, 10), base_score, 10)
WHERE base_score IS NOT NULL AND base_score != 100;

-- 3. 為了向下相容，保留 base_score 欄位但同步 points 的值
UPDATE questions 
SET base_score = points
WHERE points IS NOT NULL;

-- 4. 創建觸發器來保持 points 和 base_score 同步
CREATE OR REPLACE FUNCTION sync_question_points()
RETURNS TRIGGER AS $$
BEGIN
  -- 當 points 更新時，同步更新 base_score
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    NEW.base_score = NEW.points;
  END IF;
  
  -- 當 base_score 更新時，同步更新 points
  IF NEW.base_score IS DISTINCT FROM OLD.base_score THEN
    NEW.points = NEW.base_score;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 創建觸發器
DROP TRIGGER IF EXISTS sync_question_points_trigger ON questions;
CREATE TRIGGER sync_question_points_trigger
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION sync_question_points();

-- 6. 顯示修復結果
SELECT 
  id, 
  question_text,
  points as 管理界面使用,
  base_score as 舊系統使用,
  CASE 
    WHEN points = base_score THEN '✅ 一致'
    ELSE '❌ 不一致'
  END as 狀態
FROM questions 
ORDER BY id;
