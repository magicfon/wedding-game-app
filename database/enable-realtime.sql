-- 啟用 Supabase Realtime 功能
-- 在 Supabase SQL Editor 中執行此腳本
-- 注意：請先執行 create-missing-tables.sql 確保所有表格存在

-- 1. 檢查並啟用 game_state 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_state') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
        RAISE NOTICE 'game_state 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'game_state 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'game_state 已經在 Realtime 中';
END $$;

-- 2. 檢查並啟用 answer_records 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'answer_records') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE answer_records;
        RAISE NOTICE 'answer_records 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'answer_records 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'answer_records 已經在 Realtime 中';
END $$;

-- 3. 檢查並啟用 questions 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE questions;
        RAISE NOTICE 'questions 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'questions 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'questions 已經在 Realtime 中';
END $$;

-- 4. 檢查並啟用 users 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
        RAISE NOTICE 'users 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'users 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'users 已經在 Realtime 中';
END $$;

-- 5. 檢查並啟用 photos 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE photos;
        RAISE NOTICE 'photos 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'photos 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'photos 已經在 Realtime 中';
END $$;

-- 6. 檢查並啟用 votes 表格的 Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'votes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE votes;
        RAISE NOTICE 'votes 表格已啟用 Realtime';
    ELSE
        RAISE NOTICE 'votes 表格不存在，跳過';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'votes 已經在 Realtime 中';
END $$;

-- 7. 確保 RLS 政策允許 Realtime 訂閱
-- game_state 表格
DROP POLICY IF EXISTS "允許即時訂閱遊戲狀態" ON game_state;
CREATE POLICY "允許即時訂閱遊戲狀態" ON game_state 
FOR SELECT USING (true);

-- answer_records 表格
DROP POLICY IF EXISTS "允許即時訂閱答題記錄" ON answer_records;
CREATE POLICY "允許即時訂閱答題記錄" ON answer_records 
FOR SELECT USING (true);

-- 8. 創建觸發器來確保 updated_at 欄位被正確更新
-- 這將觸發 Realtime 事件
CREATE OR REPLACE FUNCTION notify_game_state_change()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- 通知所有訂閱者
    PERFORM pg_notify('game_state_changed', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 game_state 表格創建觸發器
DROP TRIGGER IF EXISTS game_state_change_trigger ON game_state;
CREATE TRIGGER game_state_change_trigger
    BEFORE UPDATE ON game_state
    FOR EACH ROW
    EXECUTE FUNCTION notify_game_state_change();

-- 9. 為 answer_records 創建類似的觸發器
CREATE OR REPLACE FUNCTION notify_answer_record_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 通知所有訂閱者
    PERFORM pg_notify('answer_record_changed', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 answer_records 表格創建觸發器
DROP TRIGGER IF EXISTS answer_record_change_trigger ON answer_records;
CREATE TRIGGER answer_record_change_trigger
    AFTER INSERT ON answer_records
    FOR EACH ROW
    EXECUTE FUNCTION notify_answer_record_change();

-- 10. 檢查 Realtime 是否正確啟用
-- 這個查詢會顯示哪些表格已啟用 Realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
