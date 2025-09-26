-- 將所有題目的答題時間設定為10秒
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 更新所有題目的時間限制為10秒
UPDATE questions 
SET 
  time_limit = 10,
  updated_at = NOW()
WHERE id IS NOT NULL;

-- 2. 顯示更新結果
SELECT 
  id,
  question_text,
  time_limit as 答題時間秒,
  CASE 
    WHEN time_limit = 10 
    THEN '✅ 已設定為10秒' 
    ELSE '❌ 未更新' 
  END as 狀態
FROM questions 
ORDER BY id;

-- 3. 統計更新結果
SELECT 
  COUNT(*) as 總題目數,
  COUNT(CASE WHEN time_limit = 10 THEN 1 END) as 設定為10秒的題目,
  AVG(time_limit) as 平均答題時間,
  MIN(time_limit) as 最短時間,
  MAX(time_limit) as 最長時間
FROM questions;
