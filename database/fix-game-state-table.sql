-- 修復 game_state 表格 - 添加缺少的欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 添加缺少的欄位到 game_state 表格
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS completed_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game_session_id TEXT DEFAULT gen_random_uuid()::text;

-- 2. 更新現有記錄，設置預設值
UPDATE game_state 
SET 
  completed_questions = 0,
  total_questions = 0,
  game_session_id = gen_random_uuid()::text
WHERE completed_questions IS NULL 
   OR total_questions IS NULL 
   OR game_session_id IS NULL;

-- 3. 確保有一條初始記錄
INSERT INTO game_state (
  id, 
  is_game_active, 
  is_paused, 
  completed_questions, 
  total_questions,
  game_session_id
) VALUES (
  1, 
  false, 
  false, 
  0, 
  0,
  gen_random_uuid()::text
) ON CONFLICT (id) DO UPDATE SET
  completed_questions = COALESCE(game_state.completed_questions, 0),
  total_questions = COALESCE(game_state.total_questions, 0),
  game_session_id = COALESCE(game_state.game_session_id, gen_random_uuid()::text);

-- 4. 檢查結果
SELECT 
  id,
  is_game_active,
  is_paused,
  current_question_id,
  completed_questions,
  total_questions,
  game_session_id,
  created_at,
  updated_at
FROM game_state 
WHERE id = 1;

-- 完成訊息
SELECT 'game_state 表格修復完成！' as message;
