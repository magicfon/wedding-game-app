-- LINE 用戶與手動賓客連結功能
-- 在 users 表新增 linked_guest_id 欄位，用於關聯 guest_list 中的賓客

-- 1. 新增連結欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_guest_id INTEGER REFERENCES guest_list(id) ON DELETE SET NULL;

-- 2. 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_users_linked_guest_id ON users(linked_guest_id);

-- 3. 說明
-- linked_guest_id: 對應 guest_list.id，表示此 LINE 用戶對應的手動名單賓客
-- ON DELETE SET NULL: 當關聯的賓客被刪除時，自動將此欄位設為 NULL
