-- 增強問題表格以符合 prompt 需求
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 為 questions 表格添加缺少的欄位
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS penalty_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS penalty_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS timeout_penalty_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timeout_penalty_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS speed_bonus_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_bonus_points INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 為 user_answers 表格添加答題時間欄位
ALTER TABLE user_answers 
ADD COLUMN IF NOT EXISTS answer_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;

-- 3. 創建分數調整記錄表
CREATE TABLE IF NOT EXISTS score_adjustments (
  id SERIAL PRIMARY KEY,
  user_line_id TEXT REFERENCES users(line_id),
  admin_line_id TEXT NOT NULL,
  adjustment_score INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 創建管理員操作日誌表
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_line_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'create_question', 'start_game', 'pause_game', etc.
  target_type TEXT, -- 'question', 'user', 'game', etc.
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 為 game_state 表格添加更多控制欄位
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game_session_id TEXT DEFAULT gen_random_uuid()::text;

-- 6. 創建觸發器來自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表格創建觸發器
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_state_updated_at ON game_state;
CREATE TRIGGER update_game_state_updated_at 
    BEFORE UPDATE ON game_state 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 設置 RLS 政策
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- 允許所有人查看啟用的問題
CREATE POLICY "允許查看啟用的問題" ON questions FOR SELECT USING (is_active = true);

-- 允許管理員管理問題（這裡暫時允許所有操作，之後可以加強）
CREATE POLICY "允許管理問題" ON questions FOR ALL USING (true);

-- 允許查看分數調整記錄
CREATE POLICY "允許查看分數調整" ON score_adjustments FOR SELECT USING (true);

-- 允許插入分數調整記錄
CREATE POLICY "允許插入分數調整" ON score_adjustments FOR INSERT WITH CHECK (true);

-- 允許查看管理員操作日誌
CREATE POLICY "允許查看管理員操作" ON admin_actions FOR SELECT USING (true);

-- 允許插入管理員操作日誌
CREATE POLICY "允許插入管理員操作" ON admin_actions FOR INSERT WITH CHECK (true);

-- 8. 插入初始遊戲狀態記錄（如果不存在）
INSERT INTO game_state (id, is_game_active, is_paused) 
VALUES (1, false, false) 
ON CONFLICT (id) DO NOTHING;

-- 9. 插入一些示例問題（可選）
INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, points, time_limit, created_by) VALUES 
('新郎新娘是在哪裡認識的？', '學校', '工作場所', '朋友介紹', '網路', 'B', 10, 30, 'system'),
('他們交往了多長時間？', '1年', '2年', '3年', '4年', 'C', 10, 30, 'system'),
('新郎最喜歡的顏色是什麼？', '藍色', '紅色', '綠色', '黑色', 'A', 10, 30, 'system'),
('新娘最喜歡的食物是什麼？', '義大利麵', '壽司', '火鍋', '甜點', 'D', 10, 30, 'system'),
('他們計劃去哪裡度蜜月？', '日本', '歐洲', '東南亞', '美國', 'B', 15, 45, 'system')
ON CONFLICT DO NOTHING;

-- 完成訊息
SELECT '問題表格增強完成！已添加示例問題。' as message;
