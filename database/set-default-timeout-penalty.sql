-- 將所有題目設定為預設超時扣10分
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 更新所有題目啟用超時扣分並設定為扣10分
UPDATE questions 
SET 
  timeout_penalty_enabled = true,
  timeout_penalty_score = 10,
  updated_at = NOW()
WHERE id IS NOT NULL;

-- 2. 顯示更新結果
SELECT 
  id,
  question_text,
  timeout_penalty_enabled as 啟用超時扣分,
  timeout_penalty_score as 超時扣分,
  CASE 
    WHEN timeout_penalty_enabled = true AND timeout_penalty_score = 10 
    THEN '✅ 已設定' 
    ELSE '❌ 未設定' 
  END as 狀態
FROM questions 
ORDER BY id;

-- 3. 統計更新結果
SELECT 
  COUNT(*) as 總題目數,
  COUNT(CASE WHEN timeout_penalty_enabled = true THEN 1 END) as 已啟用超時扣分,
  COUNT(CASE WHEN timeout_penalty_score = 10 THEN 1 END) as 扣分設定為10分,
  COUNT(CASE WHEN timeout_penalty_enabled = true AND timeout_penalty_score = 10 THEN 1 END) as 設定完成
FROM questions;
