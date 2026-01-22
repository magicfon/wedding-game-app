-- 為 lottery_state 表添加每次抽獎人數設定欄位
-- 執行位置: Supabase SQL Editor

-- 1. 添加 winners_per_draw 欄位
ALTER TABLE lottery_state 
ADD COLUMN IF NOT EXISTS winners_per_draw INTEGER DEFAULT 1;

-- 2. 添加欄位註解
COMMENT ON COLUMN lottery_state.winners_per_draw IS '每次抽獎抽出的中獎者人數，預設為 1';

-- 3. 確保現有記錄有預設值
UPDATE lottery_state 
SET winners_per_draw = 1 
WHERE winners_per_draw IS NULL;

-- 4. 驗證
SELECT id, is_lottery_active, winners_per_draw FROM lottery_state;
