-- 修復 questions 表格的 RLS 政策，允許管理員操作
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查當前 RLS 狀態
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'questions';

-- 2. 暫時禁用 RLS（用於測試）
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- 重新啟用 RLS 但設置正確的政策
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 3. 刪除現有的政策（如果有）
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON questions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON questions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON questions;

-- 4. 創建新的 RLS 政策

-- 允許所有用戶讀取問題（用於遊戲）
CREATE POLICY "Allow public read access" ON questions
    FOR SELECT USING (true);

-- 允許認證用戶插入問題（管理員功能）
CREATE POLICY "Allow authenticated insert" ON questions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允許認證用戶更新問題（管理員功能）
CREATE POLICY "Allow authenticated update" ON questions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 允許認證用戶刪除問題（管理員功能）
CREATE POLICY "Allow authenticated delete" ON questions
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. 或者，如果需要更寬鬆的政策（僅用於開發/測試）
-- 可以暫時允許匿名用戶進行所有操作：

-- DROP POLICY IF EXISTS "Allow public read access" ON questions;
-- DROP POLICY IF EXISTS "Allow authenticated insert" ON questions;
-- DROP POLICY IF EXISTS "Allow authenticated update" ON questions;
-- DROP POLICY IF EXISTS "Allow authenticated delete" ON questions;

-- CREATE POLICY "Allow all operations for development" ON questions
--     FOR ALL USING (true) WITH CHECK (true);

-- 6. 檢查政策是否創建成功
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'questions';

-- 7. 測試插入（這應該現在可以工作）
-- INSERT INTO questions (
--     question_text, 
--     option_a, 
--     option_b, 
--     option_c, 
--     option_d, 
--     correct_answer, 
--     points, 
--     is_active
-- ) VALUES (
--     '測試問題 - 可以刪除', 
--     '選項 A', 
--     '選項 B', 
--     '選項 C', 
--     '選項 D', 
--     'A', 
--     10, 
--     true
-- );

-- 如果測試成功，可以刪除測試資料：
-- DELETE FROM questions WHERE question_text = '測試問題 - 可以刪除';
