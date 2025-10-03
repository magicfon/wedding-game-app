-- 添加投票設定欄位到 game_state 表
-- 如果欄位已存在，此腳本會安全地跳過

-- 添加 voting_enabled 欄位
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_state' 
        AND column_name = 'voting_enabled'
    ) THEN
        ALTER TABLE game_state ADD COLUMN voting_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added voting_enabled column to game_state';
    ELSE
        RAISE NOTICE 'voting_enabled column already exists';
    END IF;
END $$;

-- 添加 votes_per_user 欄位
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_state' 
        AND column_name = 'votes_per_user'
    ) THEN
        ALTER TABLE game_state ADD COLUMN votes_per_user INTEGER DEFAULT 3;
        RAISE NOTICE 'Added votes_per_user column to game_state';
    ELSE
        RAISE NOTICE 'votes_per_user column already exists';
    END IF;
END $$;

-- 確保 game_state 表至少有一筆記錄
INSERT INTO game_state (is_game_active, is_paused, voting_enabled, votes_per_user) 
SELECT FALSE, FALSE, FALSE, 3
WHERE NOT EXISTS (SELECT 1 FROM game_state LIMIT 1);

-- 如果已有記錄但沒有設定投票欄位，更新它們
UPDATE game_state 
SET 
    voting_enabled = COALESCE(voting_enabled, FALSE),
    votes_per_user = COALESCE(votes_per_user, 3)
WHERE voting_enabled IS NULL OR votes_per_user IS NULL;

-- 顯示當前設定
SELECT 
    id,
    is_game_active,
    is_paused,
    voting_enabled,
    votes_per_user,
    created_at,
    updated_at
FROM game_state;

