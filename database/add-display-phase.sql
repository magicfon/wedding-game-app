-- 添加 display_phase 欄位到 game_state 表格
-- 用於追蹤遊戲實況頁面的顯示階段：'question', 'options', 'rankings'
-- 這讓管理控制台可以控制何時顯示排行榜

ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS display_phase VARCHAR(20) DEFAULT 'question';

-- 添加註解
COMMENT ON COLUMN game_state.display_phase IS '遊戲實況頁面的顯示階段: question/options/rankings';
