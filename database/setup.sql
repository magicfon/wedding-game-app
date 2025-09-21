-- 婚禮遊戲資料庫設置腳本
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 用戶表
CREATE TABLE IF NOT EXISTS users (
  line_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_score INTEGER DEFAULT 0,
  quiz_score INTEGER DEFAULT 0,
  photo_votes INTEGER DEFAULT 0
);

-- 2. 問題表
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 3. 遊戲狀態表
CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_question_id INTEGER REFERENCES questions(id),
  is_game_active BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  question_start_time TIMESTAMP WITH TIME ZONE,
  question_duration INTEGER DEFAULT 30, -- 秒
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_game_state CHECK (id = 1)
);

-- 4. 用戶答題記錄表
CREATE TABLE IF NOT EXISTS user_answers (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(line_id),
  question_id INTEGER REFERENCES questions(id),
  selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answer_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_time_seconds INTEGER, -- 回答時間（秒）
  UNIQUE(user_id, question_id)
);

-- 5. 照片表
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(line_id),
  image_url TEXT NOT NULL,
  blessing_message TEXT,
  is_public BOOLEAN DEFAULT true,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 照片投票表
CREATE TABLE IF NOT EXISTS photo_votes (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER REFERENCES photos(id),
  voter_id TEXT REFERENCES users(line_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_id, voter_id)
);

-- 7. 管理員表
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入初始遊戲狀態
INSERT INTO game_state (id, is_game_active, is_paused) 
VALUES (1, false, false) 
ON CONFLICT (id) DO NOTHING;

-- 插入示例問題
INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES
('新郎新娘第一次見面是在哪裡？', '咖啡廳', '學校', '公園', '朋友聚會', 'D', 10),
('他們交往了多久？', '1年', '2年', '3年', '4年', 'C', 10),
('新郎的興趣是什麼？', '攝影', '音樂', '運動', '旅行', 'B', 10),
('新娘最喜歡的顏色是？', '粉紅色', '藍色', '紫色', '白色', 'A', 10),
('他們計劃去哪裡度蜜月？', '日本', '歐洲', '馬爾地夫', '還沒決定', 'C', 10)
ON CONFLICT DO NOTHING;

-- 插入管理員帳號 (密碼: admin123)
INSERT INTO admins (username, password_hash) VALUES 
('admin', '$2b$10$rOzJqQqKQqKQqKQqKQqKQOzJqQqKQqKQqKQqKQqKQqKQqKQqKQqKQ')
ON CONFLICT (username) DO NOTHING;

-- 建立索引以提升性能
CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_vote_count ON photos(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_photo_votes_photo_id ON photo_votes(photo_id);

-- 建立觸發器以自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON game_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 建立 RLS (Row Level Security) 政策
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_votes ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看和更新自己的資料
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (line_id = current_setting('app.current_user_id', true));

-- 照片政策
CREATE POLICY "Anyone can view public photos" ON photos FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own photos" ON photos FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));
CREATE POLICY "Users can update own photos" ON photos FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

-- 投票政策
CREATE POLICY "Anyone can view votes" ON photo_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON photo_votes FOR INSERT WITH CHECK (voter_id = current_setting('app.current_user_id', true));

-- 建立函數以更新用戶總分
CREATE OR REPLACE FUNCTION update_user_total_score(user_line_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    quiz_score = COALESCE((
      SELECT SUM(points_earned) 
      FROM user_answers 
      WHERE user_id = user_line_id
    ), 0),
    photo_votes = COALESCE((
      SELECT COUNT(*) 
      FROM photo_votes pv 
      JOIN photos p ON pv.photo_id = p.id 
      WHERE p.user_id = user_line_id
    ), 0),
    total_score = COALESCE((
      SELECT SUM(points_earned) 
      FROM user_answers 
      WHERE user_id = user_line_id
    ), 0) + COALESCE((
      SELECT COUNT(*) * 5 -- 每票5分
      FROM photo_votes pv 
      JOIN photos p ON pv.photo_id = p.id 
      WHERE p.user_id = user_line_id
    ), 0)
  WHERE line_id = user_line_id;
END;
$$ LANGUAGE plpgsql;
