-- 為 lottery_history 表添加 DELETE 政策
-- 在 Supabase SQL Editor 中執行此腳本

-- 允許管理員刪除抽獎記錄
DROP POLICY IF EXISTS "允許管理員刪除抽獎記錄" ON lottery_history;
CREATE POLICY "允許管理員刪除抽獎記錄" 
ON lottery_history FOR DELETE 
USING (true);

-- 驗證政策已創建
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'lottery_history'
ORDER BY cmd;

