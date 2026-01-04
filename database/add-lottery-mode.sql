-- 為 lottery_state 表添加動畫模式欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 添加動畫模式欄位
ALTER TABLE lottery_state 
ADD COLUMN IF NOT EXISTS animation_mode VARCHAR(50) DEFAULT 'fast_shuffle';

-- 添加欄位註釋
COMMENT ON COLUMN lottery_state.animation_mode IS '抽獎動畫模式: fast_shuffle(快速切換), slot_machine(老虎機), waterfall(瀑布流), tournament(淘汰賽), spiral(螺旋)';

-- 確保現有記錄有預設值
UPDATE lottery_state 
SET animation_mode = 'fast_shuffle' 
WHERE animation_mode IS NULL;

-- 驗證
SELECT id, is_lottery_active, is_drawing, animation_mode FROM lottery_state;
