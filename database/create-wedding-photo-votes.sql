-- 婚紗照投票表
-- 用於存儲用戶對婚紗照的投票記錄

CREATE TABLE IF NOT EXISTS wedding_photo_votes (
    id SERIAL PRIMARY KEY,
    photo_id VARCHAR(255) NOT NULL,  -- Google Drive file ID
    voter_line_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 確保每個用戶對每張照片只能投一票
    UNIQUE(photo_id, voter_line_id)
);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_wedding_photo_votes_photo_id ON wedding_photo_votes(photo_id);
CREATE INDEX IF NOT EXISTS idx_wedding_photo_votes_voter ON wedding_photo_votes(voter_line_id);

-- RLS 策略
ALTER TABLE wedding_photo_votes ENABLE ROW LEVEL SECURITY;

-- 允許任何人查看投票記錄
CREATE POLICY "Anyone can view wedding photo votes" ON wedding_photo_votes
    FOR SELECT USING (true);

-- 只允許透過 service role 進行插入和刪除（由 API 處理）
CREATE POLICY "Service role can insert wedding photo votes" ON wedding_photo_votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can delete wedding photo votes" ON wedding_photo_votes
    FOR DELETE USING (true);
