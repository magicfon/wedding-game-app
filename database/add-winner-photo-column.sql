-- 為 lottery_history 表添加中獎照片欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 添加中獎照片 ID 和 URL 欄位
ALTER TABLE lottery_history 
ADD COLUMN IF NOT EXISTS winner_photo_id INTEGER,
ADD COLUMN IF NOT EXISTS winner_photo_url TEXT;

-- 添加欄位註釋
COMMENT ON COLUMN lottery_history.winner_photo_id IS '中獎照片的 ID（對應 photos 表）';
COMMENT ON COLUMN lottery_history.winner_photo_url IS '中獎照片的 URL';

-- 驗證
SELECT id, winner_display_name, winner_photo_id, winner_photo_url FROM lottery_history LIMIT 5;
