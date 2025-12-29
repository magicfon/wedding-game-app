-- 添加管理員等級欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 添加 admin_level 欄位到 admin_line_ids 表格
-- 'system' = 系統管理員（完整權限）
-- 'event' = 活動管理員（受限權限）
ALTER TABLE admin_line_ids ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'event';

-- 2. 將現有管理員設為系統管理員（因為他們是原有的完整權限管理員）
UPDATE admin_line_ids SET admin_level = 'system' WHERE admin_level IS NULL OR admin_level = 'event';

-- 3. 添加約束確保只能是 'system' 或 'event'
-- 注意：如果已存在約束，此命令會失敗，可以忽略錯誤
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_line_ids_admin_level_check'
    ) THEN
        ALTER TABLE admin_line_ids ADD CONSTRAINT admin_line_ids_admin_level_check 
        CHECK (admin_level IN ('system', 'event'));
    END IF;
END $$;

-- 完成
SELECT 'Admin level migration completed!' as message;
