-- 診斷 lottery-machine-live 抽獎失敗問題
-- 在 Supabase SQL Editor 中執行此腳本來診斷問題

-- ============================================
-- 1. 檢查 lottery_machine_state 表
-- ============================================

-- 檢查表是否存在
SELECT 
    'lottery_machine_state 表是否存在' as check_item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lottery_machine_state') 
        THEN '✅ 存在' 
        ELSE '❌ 不存在' 
    END as result;

-- 檢查表中的記錄
SELECT 
    'lottery_machine_state 記錄數量' as check_item,
    COUNT(*) as result
FROM lottery_machine_state;

-- 顯示 lottery_machine_state 的所有記錄
SELECT 
    'lottery_machine_state 記錄詳情' as check_item,
    id,
    is_lottery_active,
    is_drawing,
    current_draw_id,
    max_photos_for_lottery,
    animation_mode,
    notify_winner_enabled,
    winners_per_draw,
    updated_at as result
FROM lottery_machine_state;

-- 檢查 lottery_machine_state 的 RLS 狀態
SELECT 
    'lottery_machine_state RLS 狀態' as check_item,
    CASE 
        WHEN relrowsecurity THEN '✅ 已啟用' 
        ELSE '❌ 未啟用' 
    END as result
FROM pg_class 
WHERE relname = 'lottery_machine_state';

-- 檢查 lottery_machine_state 的 RLS 政策
SELECT 
    'lottery_machine_state RLS 政策' as check_item,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '讀取'
        WHEN cmd = 'INSERT' THEN '插入'
        WHEN cmd = 'UPDATE' THEN '更新'
        WHEN cmd = 'DELETE' THEN '刪除'
        ELSE cmd
    END as operation_name,
    CASE 
        WHEN qual IS NOT NULL OR with_check IS NOT NULL THEN '✅ 已設置'
        ELSE '❌ 未設置'
    END as status
FROM pg_policies 
WHERE tablename = 'lottery_machine_state'
ORDER BY cmd;

-- ============================================
-- 2. 檢查 lottery_history 表
-- ============================================

-- 檢查表是否存在
SELECT 
    'lottery_history 表是否存在' as check_item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lottery_history') 
        THEN '✅ 存在' 
        ELSE '❌ 不存在' 
    END as result;

-- 檢查 lottery_history 的欄位
SELECT 
    'lottery_history 欄位檢查' as check_item,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'winner_photo_id' THEN '⚠️ 需要'
        WHEN column_name = 'winner_photo_url' THEN '⚠️ 需要'
        ELSE '✅ 正常'
    END as status
FROM information_schema.columns 
WHERE table_name = 'lottery_history'
ORDER BY ordinal_position;

-- 檢查 lottery_history 的 RLS 政策
SELECT 
    'lottery_history RLS 政策' as check_item,
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '讀取'
        WHEN cmd = 'INSERT' THEN '插入'
        WHEN cmd = 'UPDATE' THEN '更新'
        WHEN cmd = 'DELETE' THEN '刪除'
        ELSE cmd
    END as operation_name,
    CASE 
        WHEN qual IS NOT NULL OR with_check IS NOT NULL THEN '✅ 已設置'
        ELSE '❌ 未設置'
    END as status
FROM pg_policies 
WHERE tablename = 'lottery_history'
ORDER BY cmd;

-- 顯示最近的抽獎記錄
SELECT 
    'lottery_history 最近記錄' as check_item,
    id,
    winner_display_name,
    winner_photo_id,
    winner_photo_url,
    draw_time as result
FROM lottery_history
ORDER BY draw_time DESC
LIMIT 5;

-- ============================================
-- 3. 檢查 photos 表
-- ============================================

-- 檢查公開照片數量
SELECT 
    'photos 公開照片數量' as check_item,
    COUNT(*) as result
FROM photos
WHERE is_public = true;

-- 檢查 photos 的 RLS 政策
SELECT 
    'photos RLS 政策（SELECT）' as check_item,
    policyname,
    qual as condition
FROM pg_policies 
WHERE tablename = 'photos' AND cmd = 'SELECT';

-- ============================================
-- 4. 檢查 users 表
-- ============================================

-- 檢查 users 的 RLS 政策
SELECT 
    'users RLS 政策（SELECT）' as check_item,
    policyname,
    qual as condition
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'SELECT';

-- ============================================
-- 5. 測試查詢權限
-- ============================================

-- 測試查詢 lottery_machine_state
DO $$
BEGIN
    RAISE NOTICE '🔍 測試查詢 lottery_machine_state...';
    PERFORM 1 FROM lottery_machine_state LIMIT 1;
    RAISE NOTICE '✅ lottery_machine_state 查詢成功';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lottery_machine_state 查詢失敗: %', SQLERRM;
END $$;

-- 測試查詢 photos
DO $$
BEGIN
    RAISE NOTICE '🔍 測試查詢 photos...';
    PERFORM 1 FROM photos WHERE is_public = true LIMIT 1;
    RAISE NOTICE '✅ photos 查詢成功';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ photos 查詢失敗: %', SQLERRM;
END $$;

-- 測試查詢 lottery_history
DO $$
BEGIN
    RAISE NOTICE '🔍 測試查詢 lottery_history...';
    PERFORM 1 FROM lottery_history LIMIT 1;
    RAISE NOTICE '✅ lottery_history 查詢成功';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lottery_history 查詢失敗: %', SQLERRM;
END $$;

-- 測試查詢 users
DO $$
BEGIN
    RAISE NOTICE '🔍 測試查詢 users...';
    PERFORM 1 FROM users LIMIT 1;
    RAISE NOTICE '✅ users 查詢成功';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ users 查詢失敗: %', SQLERRM;
END $$;

-- ============================================
-- 6. 總結
-- ============================================

SELECT '診斷完成！請檢查上述結果，找出問題所在。' as check_item, '✅ 完成' as result;
