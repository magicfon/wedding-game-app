-- 添加基於 Line ID 的管理員認證
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 修改 users 表格，添加 is_admin 欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. 創建專門的管理員 Line ID 表格
CREATE TABLE IF NOT EXISTS admin_line_ids (
  id SERIAL PRIMARY KEY,
  line_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- 3. 設置 RLS 政策
ALTER TABLE admin_line_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允許查詢管理員ID" ON admin_line_ids;
CREATE POLICY "允許查詢管理員ID" ON admin_line_ids FOR SELECT USING (true);

-- 4. 創建函數來檢查管理員身份
CREATE OR REPLACE FUNCTION is_line_admin(check_line_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_line_ids 
    WHERE line_id = check_line_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 創建函數來將用戶標記為管理員
CREATE OR REPLACE FUNCTION set_user_admin_status(user_line_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET is_admin = is_line_admin(user_line_id),
      updated_at = NOW()
  WHERE line_id = user_line_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 創建觸發器，當用戶登入時自動檢查管理員身份
CREATE OR REPLACE FUNCTION update_admin_status_on_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_admin := is_line_admin(NEW.line_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_status ON users;
CREATE TRIGGER trigger_update_admin_status
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_status_on_login();

-- 7. 插入初始管理員（請替換為實際的 Line ID）
-- 注意：請將 'YOUR_LINE_ID_HERE' 替換為實際的管理員 Line ID
INSERT INTO admin_line_ids (line_id, display_name, notes, created_by) 
VALUES 
  ('U58514ae2d8f54fecb2b2ff92245ce1e1', '主管理員', '系統初始管理員', 'system')
ON CONFLICT (line_id) DO NOTHING;

-- 8. 更新現有用戶的管理員狀態
UPDATE users SET is_admin = is_line_admin(line_id) WHERE line_id IS NOT NULL;

-- 9. 創建管理員操作日誌表格（可選）
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_line_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允許插入管理員操作" ON admin_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "允許查詢管理員操作" ON admin_actions FOR SELECT USING (true);

-- 完成
SELECT 'Line ID 管理員系統設置完成！' as message;
