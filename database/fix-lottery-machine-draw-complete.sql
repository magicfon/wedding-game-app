-- 完整修復 lottery-machine-live 抽獎失敗問題
-- 在 Supabase SQL Editor 中執行此腳本

-- ============================================
-- 1. 修復 lottery_history 表的欄位
-- ============================================

-- 添加中獎照片 ID 和 URL 欄位（如果不存在）
ALTER TABLE lottery_history 
ADD COLUMN IF NOT EXISTS winner_photo_id INTEGER,
ADD COLUMN IF NOT EXISTS winner_photo_url TEXT;

-- 添加欄位註釋
COMMENT ON COLUMN lottery_history.winner_photo_id IS '中獎照片的 ID（對應 photos 表）';
COMMENT ON COLUMN lottery_history.winner_photo_url IS '中獎照片的 URL';

-- ============================================
-- 2. 修復 lottery_history 表的 RLS 權限
-- ============================================

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE lottery_history ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 SELECT 政策（如果存在）
DROP POLICY IF EXISTS "允許所有人查看抽獎歷史" ON lottery_history;

-- 創建 SELECT 政策 - 允許所有人讀取
CREATE POLICY "允許所有人查看抽獎歷史" ON lottery_history
FOR SELECT USING (true);

-- 刪除舊的 INSERT 政策（如果存在）
DROP POLICY IF EXISTS "允許管理員新增抽獎記錄" ON lottery_history;

-- 創建 INSERT 政策 - 允許所有人插入
CREATE POLICY "允許所有人新增抽獎記錄" ON lottery_history
FOR INSERT WITH CHECK (true);

-- 刪除舊的 UPDATE 政策（如果存在）
DROP POLICY IF EXISTS "允許管理員更新抽獎記錄" ON lottery_history;

-- 創建 UPDATE 政策 - 允許所有人更新
CREATE POLICY "允許所有人更新抽獎記錄" ON lottery_history
FOR UPDATE USING (true);

-- 創建 DELETE 政策 - 允許所有人刪除（以防需要重置）
CREATE POLICY "允許所有人刪除抽獎記錄" ON lottery_history
FOR DELETE USING (true);

-- ============================================
-- 3. 修復 lottery_machine_state 表的 RLS 權限
-- ============================================

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE lottery_machine_state ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 SELECT 政策（如果存在）
DROP POLICY IF EXISTS "允許即時訂閱彩球機狀態" ON lottery_machine_state;

-- 創建 SELECT 政策 - 允許所有人讀取
CREATE POLICY "允許讀取彩球機狀態" ON lottery_machine_state
FOR SELECT USING (true);

-- 創建 UPDATE 政策 - 允許所有人更新
CREATE POLICY "允許更新彩球機狀態" ON lottery_machine_state
FOR UPDATE USING (true);

-- 創建 INSERT 政策 - 允許所有人插入（雖然通常只需要更新 id=1 的記錄）
CREATE POLICY "允許插入彩球機狀態" ON lottery_machine_state
FOR INSERT WITH CHECK (true);

-- 創建 DELETE 政策 - 允許所有人刪除（以防需要重置）
CREATE POLICY "允許刪除彩球機狀態" ON lottery_machine_state
FOR DELETE USING (true);

-- ============================================
-- 4. 驗證修復
-- ============================================

-- 檢查 lottery_history 表的欄位
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lottery_history'
ORDER BY ordinal_position;

-- 檢查 lottery_history 表的 RLS 政策
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'lottery_history';

-- 檢查 lottery_machine_state 表的 RLS 政策
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'lottery_machine_state';

-- ============================================
-- 完成！
-- ============================================
-- 執行完成後，lottery-machine-live 的抽獎功能應該可以正常運作
