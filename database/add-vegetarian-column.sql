-- 新增素食欄位到 guest_list 表格
ALTER TABLE guest_list ADD COLUMN IF NOT EXISTS vegetarian INTEGER DEFAULT 0;

-- 更新 total_guests 計算說明：total_guests = adults + children (素食人數不影響總人數計算)
-- 素食人數是額外標註，表示這些賓客中有幾位需要素食餐
