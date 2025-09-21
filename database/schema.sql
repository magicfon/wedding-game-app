-- 創建用戶表
CREATE TABLE IF NOT EXISTS users (
    line_id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    total_score INTEGER DEFAULT 0,
    join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 創建題目表
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建答題記錄表
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

-- 創建照片表
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

-- 創建投票記錄表
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    voter_line_id VARCHAR(255) REFERENCES users(line_id),
    photo_id INTEGER REFERENCES photos(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(voter_line_id, photo_id) -- 防止重複投票
);

-- 創建分數調整記錄表
CREATE TABLE IF NOT EXISTS score_adjustments (
    id SERIAL PRIMARY KEY,
    user_line_id VARCHAR(255) REFERENCES users(line_id),
    admin_id VARCHAR(255) NOT NULL,
    adjustment_score INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建遊戲狀態表（用於控制遊戲流程）
CREATE TABLE IF NOT EXISTS game_state (
    id SERIAL PRIMARY KEY,
    current_question_id INTEGER REFERENCES questions(id),
    is_game_active BOOLEAN DEFAULT FALSE,
    is_paused BOOLEAN DEFAULT FALSE,
    question_start_time TIMESTAMP WITH TIME ZONE,
    voting_enabled BOOLEAN DEFAULT FALSE,
    votes_per_user INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入初始遊戲狀態
INSERT INTO game_state (is_game_active, is_paused, voting_enabled, votes_per_user) 
VALUES (FALSE, FALSE, FALSE, 3) 
ON CONFLICT DO NOTHING;

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_answer_records_user_question ON answer_records(user_line_id, question_id);
CREATE INDEX IF NOT EXISTS idx_photos_public_upload_time ON photos(is_public, upload_time DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_votes_photo_id ON votes(photo_id);
CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);

-- 創建觸發器來自動更新照片投票數
CREATE OR REPLACE FUNCTION update_photo_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photos 
        SET vote_count = vote_count + 1 
        WHERE id = NEW.photo_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photos 
        SET vote_count = vote_count - 1 
        WHERE id = OLD.photo_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_photo_vote_count
    AFTER INSERT OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_photo_vote_count();

-- 創建觸發器來自動更新用戶總分
CREATE OR REPLACE FUNCTION update_user_total_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_score = total_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE users 
        SET total_score = total_score - OLD.earned_score + NEW.earned_score 
        WHERE line_id = NEW.user_line_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET total_score = total_score - OLD.earned_score 
        WHERE line_id = OLD.user_line_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_total_score
    AFTER INSERT OR UPDATE OR DELETE ON answer_records
    FOR EACH ROW EXECUTE FUNCTION update_user_total_score();

-- 創建觸發器來處理分數調整
CREATE OR REPLACE FUNCTION apply_score_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET total_score = total_score + NEW.adjustment_score 
    WHERE line_id = NEW.user_line_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_apply_score_adjustment
    AFTER INSERT ON score_adjustments
    FOR EACH ROW EXECUTE FUNCTION apply_score_adjustment();
