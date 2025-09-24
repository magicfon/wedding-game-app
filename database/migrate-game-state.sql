-- 遷移 game_state 表格到新結構
-- 新增缺少的欄位

-- 1. 新增 is_waiting_for_players 欄位
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS is_waiting_for_players BOOLEAN DEFAULT TRUE;

-- 2. 新增 qr_code_url 欄位
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- 3. 更新現有記錄的預設值
UPDATE game_state 
SET 
    is_waiting_for_players = TRUE,
    qr_code_url = CASE 
        WHEN qr_code_url IS NULL THEN 'https://your-app-url.vercel.app/quiz'
        ELSE qr_code_url 
    END
WHERE id = 1;

-- 4. 確保 RLS 政策存在
DROP POLICY IF EXISTS "允許所有操作_game_state" ON game_state;
CREATE POLICY "允許所有操作_game_state" ON game_state FOR ALL USING (true);

-- 5. 顯示更新後的表格結構
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'game_state' 
ORDER BY ordinal_position;
