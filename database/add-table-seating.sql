-- 1. 在 users 表格新增 table_number 欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS table_number VARCHAR(20);

-- 2. 新增 guest_list 表格 (給非 LINE 用戶查詢)
CREATE TABLE IF NOT EXISTS guest_list (
    id SERIAL PRIMARY KEY,
    guest_name VARCHAR(100) NOT NULL,
    table_number VARCHAR(20) NOT NULL,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    total_guests INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_guest_list_name ON guest_list(guest_name);
CREATE INDEX IF NOT EXISTS idx_users_table_number ON users(table_number);

-- RLS
ALTER TABLE guest_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允許所有操作_guest_list" ON guest_list;
CREATE POLICY "允許所有操作_guest_list" ON guest_list FOR ALL USING (true);
