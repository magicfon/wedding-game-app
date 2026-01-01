-- 增加全局答題時間設定到 game_state 表
-- 這個欄位會覆蓋個別題目的 time_limit 設定

ALTER TABLE game_state ADD COLUMN IF NOT EXISTS question_time_limit INTEGER DEFAULT 30;

-- 更新現有記錄
UPDATE game_state SET question_time_limit = 30 WHERE id = 1 AND question_time_limit IS NULL;

-- 驗證
SELECT id, question_display_duration, question_time_limit FROM game_state WHERE id = 1;
