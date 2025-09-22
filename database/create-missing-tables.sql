-- 創建缺失的表格
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 確保 users 表格存在且結構正確
CREATE TABLE IF NOT EXISTS users (
    line_id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    total_score INTEGER DEFAULT 0,
    join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 確保 questions 表格存在且結構正確
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D')) NOT NULL,
    base_score INTEGER DEFAULT 100,
    penalty_enabled BOOLEAN DEFAULT FALSE,
    penalty_score INTEGER DEFAULT 0,
    timeout_penalty_enabled BOOLEAN DEFAULT FALSE,
    timeout_penalty_score INTEGER DEFAULT 0,
    time_limit INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 創建 answer_records 表格（應用程式碼中使用的表格）
CREATE TABLE IF NOT EXISTS answer_records (
    id SERIAL PRIMARY KEY,
    user_line_id VARCHAR(255) REFERENCES users(line_id),
    question_id INTEGER REFERENCES questions(id),
    selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
    answer_time INTEGER NOT NULL, -- 答題用時（毫秒）
    is_correct BOOLEAN NOT NULL,
    earned_score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 確保 game_state 表格存在且結構正確
CREATE TABLE IF NOT EXISTS game_state (
    id SERIAL PRIMARY KEY,
    current_question_id INTEGER REFERENCES questions(id),
    is_game_active BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    question_start_time TIMESTAMP WITH TIME ZONE,
    voting_enabled BOOLEAN DEFAULT FALSE,
    votes_per_user INTEGER DEFAULT 3,
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    game_session_id TEXT DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 創建 photos 表格
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    uploader_line_id VARCHAR(255) REFERENCES users(line_id),
    google_drive_file_id VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    blessing_message TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    vote_count INTEGER DEFAULT 0,
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 創建 votes 表格
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    voter_line_id VARCHAR(255) REFERENCES users(line_id),
    photo_id INTEGER REFERENCES photos(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(voter_line_id, photo_id) -- 防止重複投票
);

-- 7. 創建 admin_line_ids 表格（管理員認證）
CREATE TABLE IF NOT EXISTS admin_line_ids (
    id SERIAL PRIMARY KEY,
    line_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. 插入初始遊戲狀態（如果不存在）
INSERT INTO game_state (is_game_active, is_paused, voting_enabled, votes_per_user) 
VALUES (FALSE, FALSE, FALSE, 3) 
ON CONFLICT DO NOTHING;

-- 9. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_answer_records_user_question ON answer_records(user_line_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answer_records_question_time ON answer_records(question_id, answer_time);
CREATE INDEX IF NOT EXISTS idx_photos_public_upload_time ON photos(is_public, upload_time DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_votes_photo_id ON votes(photo_id);
CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);

-- 10. 設置 RLS 政策
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_line_ids ENABLE ROW LEVEL SECURITY;

-- 允許所有人查看和操作（簡化的政策，可以後續加強）
DROP POLICY IF EXISTS "允許所有操作_users" ON users;
CREATE POLICY "允許所有操作_users" ON users FOR ALL USING (true);

DROP POLICY IF EXISTS "允許所有操作_questions" ON questions;
CREATE POLICY "允許所有操作_questions" ON questions FOR ALL USING (true);

DROP POLICY IF EXISTS "允許所有操作_answer_records" ON answer_records;
CREATE POLICY "允許所有操作_answer_records" ON answer_records FOR ALL USING (true);

DROP POLICY IF EXISTS "允許所有操作_game_state" ON game_state;
CREATE POLICY "允許所有操作_game_state" ON game_state FOR ALL USING (true);

DROP POLICY IF EXISTS "允許所有操作_photos" ON photos;
CREATE POLICY "允許所有操作_photos" ON photos FOR ALL USING (true);

DROP POLICY IF EXISTS "允許所有操作_votes" ON votes;
CREATE POLICY "允許所有操作_votes" ON votes FOR ALL USING (true);

DROP POLICY IF EXISTS "允許所有操作_admin_line_ids" ON admin_line_ids;
CREATE POLICY "允許所有操作_admin_line_ids" ON admin_line_ids FOR ALL USING (true);

-- 11. 插入一些示例問題（如果不存在）
INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, base_score, time_limit) VALUES
('新郎新娘第一次見面是在哪裡？', '咖啡廳', '學校', '公園', '朋友聚會', 'D', 100, 30),
('新郎的興趣是什麼？', '攝影', '音樂', '運動', '旅行', 'B', 100, 30),
('新娘最喜歡的顏色是？', '粉紅色', '藍色', '紫色', '白色', 'A', 100, 30)
ON CONFLICT DO NOTHING;
