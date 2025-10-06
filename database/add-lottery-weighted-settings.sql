-- 為 lottery_state 表添加加權抽獎設定欄位

-- 添加加權上限欄位（預設為 5 張）
ALTER TABLE lottery_state 
ADD COLUMN IF NOT EXISTS max_photos_for_lottery INTEGER DEFAULT 5;

-- 添加註釋
COMMENT ON COLUMN lottery_state.max_photos_for_lottery IS '加權抽獎時，每人最多計算的照片數量（0 = 平等機率，不加權）';

-- 更新現有記錄（如果有的話）
UPDATE lottery_state 
SET max_photos_for_lottery = 5 
WHERE max_photos_for_lottery IS NULL;

-- 查看結果
SELECT * FROM lottery_state;

