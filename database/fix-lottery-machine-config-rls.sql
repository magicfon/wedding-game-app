-- 修復 lottery_machine_config 表的 RLS 政策
-- 添加 UPDATE 和 INSERT 權限，讓 API 可以儲存設定

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE lottery_machine_config ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 SELECT 政策（如果存在）
DROP POLICY IF EXISTS "允許即時訂閱彩球機設定" ON lottery_machine_config;

-- 創建 SELECT 政策 - 允許所有人讀取
CREATE POLICY "允許讀取彩球機設定" ON lottery_machine_config
FOR SELECT USING (true);

-- 創建 UPDATE 政策 - 允許所有人更新
CREATE POLICY "允許更新彩球機設定" ON lottery_machine_config
FOR UPDATE USING (true);

-- 創建 INSERT 政策 - 允許所有人插入（雖然通常只需要更新 id=1 的記錄）
CREATE POLICY "允許插入彩球機設定" ON lottery_machine_config
FOR INSERT WITH CHECK (true);

-- 創建 DELETE 政策 - 允許所有人刪除（以防需要重置）
CREATE POLICY "允許刪除彩球機設定" ON lottery_machine_config
FOR DELETE USING (true);

-- 註釋說明
COMMENT ON POLICY "允許讀取彩球機設定" ON lottery_machine_config IS '允許所有用戶讀取彩球機設定';
COMMENT ON POLICY "允許更新彩球機設定" ON lottery_machine_config IS '允許所有用戶更新彩球機設定';
COMMENT ON POLICY "允許插入彩球機設定" ON lottery_machine_config IS '允許所有用戶插入彩球機設定';
COMMENT ON POLICY "允許刪除彩球機設定" ON lottery_machine_config IS '允許所有用戶刪除彩球機設定';
