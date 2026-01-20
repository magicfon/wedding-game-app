-- 為 lottery_state 表添加中獎通知開關欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 添加 notify_winner_enabled 欄位
ALTER TABLE lottery_state 
ADD COLUMN IF NOT EXISTS notify_winner_enabled BOOLEAN DEFAULT TRUE;

-- 添加欄位註解
COMMENT ON COLUMN lottery_state.notify_winner_enabled IS '是否啟用中獎 LINE 通知，TRUE 為發送通知，FALSE 為不發送';

-- 完成！
