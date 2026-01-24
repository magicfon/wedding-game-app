-- 啟用彩球機相關表格的 Realtime 功能
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查並啟用 lottery_machine_state 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lottery_machine_state') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE lottery_machine_state;
        RAISE NOTICE 'lottery_machine_state 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'lottery_machine_state 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'lottery_machine_state 已經在 Realtime 中';
END $$;

-- 2. 檢查並啟用 lottery_machine_config 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lottery_machine_config') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE lottery_machine_config;
        RAISE NOTICE 'lottery_machine_config 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'lottery_machine_config 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'lottery_machine_config 已經在 Realtime 中';
END $$;

-- 3. 確保 RLS 政策允許 Realtime 訂閱
-- lottery_machine_state 表格
DROP POLICY IF EXISTS "允許即時訂閱彩球機狀態" ON lottery_machine_state;
CREATE POLICY "允許即時訂閱彩球機狀態" ON lottery_machine_state 
FOR SELECT USING (true);

-- lottery_machine_config 表格
DROP POLICY IF EXISTS "允許即時訂閱彩球機設定" ON lottery_machine_config;
CREATE POLICY "允許即時訂閱彩球機設定" ON lottery_machine_config 
FOR SELECT USING (true);

-- 4. 創建觸發器來確保 updated_at 欄位被正確更新
-- 這將觸發 Realtime 事件
CREATE OR REPLACE FUNCTION notify_lottery_machine_state_change()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 lottery_machine_state 表格創建觸發器
DROP TRIGGER IF EXISTS lottery_machine_state_change_trigger ON lottery_machine_state;
CREATE TRIGGER lottery_machine_state_change_trigger
    BEFORE UPDATE ON lottery_machine_state
    FOR EACH ROW
    EXECUTE FUNCTION notify_lottery_machine_state_change();

-- 5. 檢查 Realtime 是否正確啟用
-- 這個查詢會顯示哪些表格已啟用 Realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('lottery_machine_state', 'lottery_machine_config');
