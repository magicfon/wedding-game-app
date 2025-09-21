-- 修復 RLS 政策腳本
-- 在 Supabase SQL Editor 中執行此腳本

-- 為 users 表格設置 RLS 政策
-- 注意：這些政策允許公開存取，適合婚禮遊戲的使用場景

-- 1. 確保 RLS 已啟用
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "允許插入用戶資料" ON users;
DROP POLICY IF EXISTS "允許查詢用戶資料" ON users;  
DROP POLICY IF EXISTS "允許更新用戶資料" ON users;
DROP POLICY IF EXISTS "允許刪除用戶資料" ON users;

-- 3. 創建新的寬鬆政策（適合婚禮遊戲場景）
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

-- 為其他表格設置類似的政策
-- questions 表格
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許查詢問題" ON questions;
CREATE POLICY "允許查詢問題" ON questions FOR SELECT USING (true);

-- user_answers 表格  
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許插入答案" ON user_answers;
DROP POLICY IF EXISTS "允許查詢答案" ON user_answers;
CREATE POLICY "允許插入答案" ON user_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "允許查詢答案" ON user_answers FOR SELECT USING (true);

-- photos 表格
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許插入照片" ON photos;
DROP POLICY IF EXISTS "允許查詢照片" ON photos;
DROP POLICY IF EXISTS "允許更新照片" ON photos;
CREATE POLICY "允許插入照片" ON photos FOR INSERT WITH CHECK (true);
CREATE POLICY "允許查詢照片" ON photos FOR SELECT USING (true);
CREATE POLICY "允許更新照片" ON photos FOR UPDATE USING (true);

-- photo_votes 表格
ALTER TABLE photo_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許插入投票" ON photo_votes;
DROP POLICY IF EXISTS "允許查詢投票" ON photo_votes;
CREATE POLICY "允許插入投票" ON photo_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "允許查詢投票" ON photo_votes FOR SELECT USING (true);

-- game_state 表格 
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許查詢遊戲狀態" ON game_state;
DROP POLICY IF EXISTS "允許更新遊戲狀態" ON game_state;
CREATE POLICY "允許查詢遊戲狀態" ON game_state FOR SELECT USING (true);
CREATE POLICY "允許更新遊戲狀態" ON game_state FOR UPDATE USING (true);

-- 完成
SELECT 'RLS 政策設置完成！' as message;
