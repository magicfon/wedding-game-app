-- 簡化修復 lottery-machine-live 抽獎失敗問題
-- 只添加缺少的欄位，不重複創建已存在的 policy

-- ============================================
-- 1. 為 lottery_history 表添加缺少的欄位
-- ============================================

-- 添加中獎照片 ID 和 URL 欄位（如果不存在）
ALTER TABLE lottery_history 
ADD COLUMN IF NOT EXISTS winner_photo_id INTEGER,
ADD COLUMN IF NOT EXISTS winner_photo_url TEXT;

-- 添加欄位註釋
COMMENT ON COLUMN lottery_history.winner_photo_id IS '中獎照片的 ID（對應 photos 表）';
COMMENT ON COLUMN lottery_history.winner_photo_url IS '中獎照片的 URL';

-- ============================================
-- 2. 確保 lottery_machine_state 表有初始記錄
-- ============================================

-- 插入初始記錄（如果不存在）
INSERT INTO lottery_machine_state (id, is_lottery_active, is_drawing, current_draw_id, max_photos_for_lottery, animation_mode, notify_winner_enabled, winners_per_draw, updated_at)
SELECT 1, false, false, NULL, 5, 'lottery_machine', true, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM lottery_machine_state WHERE id = 1);

-- ============================================
-- 3. 驗證修復
-- ============================================

-- 檢查 lottery_history 表的欄位
SELECT 
    'lottery_history 欄位檢查' as check_item,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('winner_photo_id', 'winner_photo_url') THEN '✅ 已添加'
        ELSE '✅ 正常'
    END as status
FROM information_schema.columns 
WHERE table_name = 'lottery_history'
ORDER BY ordinal_position;

-- 檢查 lottery_machine_state 表的記錄
SELECT 
    'lottery_machine_state 記錄' as check_item,
    id,
    is_lottery_active,
    is_drawing,
    current_draw_id,
    updated_at as result
FROM lottery_machine_state;

-- ============================================
-- 完成！
-- ============================================
SELECT '修復完成！請測試抽獎功能。' as check_item, '✅ 完成' as result;
