-- 安全的 RLS 政策修復腳本
-- 在 Supabase SQL Editor 中執行此腳本
-- 只處理確實存在的表格

-- 1. users 表格
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許插入用戶資料" ON users;
DROP POLICY IF EXISTS "允許查詢用戶資料" ON users;  
DROP POLICY IF EXISTS "允許更新用戶資料" ON users;
DROP POLICY IF EXISTS "允許刪除用戶資料" ON users;

CREATE POLICY "允許插入用戶資料" ON users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "允許查詢用戶資料" ON users 
FOR SELECT 
USING (true);

CREATE POLICY "允許更新用戶資料" ON users 
FOR UPDATE 
USING (true);

CREATE POLICY "允許刪除用戶資料" ON users 
FOR DELETE 
USING (true);

-- 2. questions 表格
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許查詢問題" ON questions;
DROP POLICY IF EXISTS "允許插入問題" ON questions;
DROP POLICY IF EXISTS "允許更新問題" ON questions;

CREATE POLICY "允許查詢問題" ON questions FOR SELECT USING (true);
CREATE POLICY "允許插入問題" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "允許更新問題" ON questions FOR UPDATE USING (true);

-- 3. user_answers 表格  
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許插入答案" ON user_answers;
DROP POLICY IF EXISTS "允許查詢答案" ON user_answers;
DROP POLICY IF EXISTS "允許更新答案" ON user_answers;

CREATE POLICY "允許插入答案" ON user_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "允許查詢答案" ON user_answers FOR SELECT USING (true);
CREATE POLICY "允許更新答案" ON user_answers FOR UPDATE USING (true);

-- 4. game_state 表格 
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許查詢遊戲狀態" ON game_state;
DROP POLICY IF EXISTS "允許更新遊戲狀態" ON game_state;
DROP POLICY IF EXISTS "允許插入遊戲狀態" ON game_state;

CREATE POLICY "允許查詢遊戲狀態" ON game_state FOR SELECT USING (true);
CREATE POLICY "允許更新遊戲狀態" ON game_state FOR UPDATE USING (true);
CREATE POLICY "允許插入遊戲狀態" ON game_state FOR INSERT WITH CHECK (true);

-- 5. photos 表格 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'photos') THEN
        ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "允許插入照片" ON photos;
        DROP POLICY IF EXISTS "允許查詢照片" ON photos;
        DROP POLICY IF EXISTS "允許更新照片" ON photos;
        
        EXECUTE 'CREATE POLICY "允許插入照片" ON photos FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "允許查詢照片" ON photos FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "允許更新照片" ON photos FOR UPDATE USING (true)';
    END IF;
END $$;

-- 6. photo_votes 表格 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'photo_votes') THEN
        ALTER TABLE photo_votes ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "允許插入投票" ON photo_votes;
        DROP POLICY IF EXISTS "允許查詢投票" ON photo_votes;
        
        EXECUTE 'CREATE POLICY "允許插入投票" ON photo_votes FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "允許查詢投票" ON photo_votes FOR SELECT USING (true)';
    END IF;
END $$;

-- 7. admins 表格 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admins') THEN
        ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "允許查詢管理員" ON admins;
        
        EXECUTE 'CREATE POLICY "允許查詢管理員" ON admins FOR SELECT USING (true)';
    END IF;
END $$;

-- 完成
SELECT 'RLS 政策設置完成！' as message;
