-- 診斷和清理照片資料
-- 請在 Supabase SQL Editor 中執行

-- 1. 顯示所有照片的詳細資訊
SELECT 
    p.id as "照片ID",
    p.user_id as "上傳者ID",
    u.display_name as "上傳者名稱",
    p.is_public as "公開",
    p.vote_count as "票數",
    p.created_at as "上傳時間",
    p.image_url as "圖片URL",
    LENGTH(p.image_url) as "URL長度",
    CASE 
        WHEN p.image_url IS NULL THEN '❌ 無圖片'
        WHEN p.image_url = '' THEN '❌ 空白'
        WHEN p.user_id IS NULL THEN '⚠️ 無上傳者'
        WHEN u.line_id IS NULL THEN '⚠️ 上傳者不存在'
        ELSE '✅ 正常'
    END as "狀態"
FROM photos p
LEFT JOIN users u ON p.user_id = u.line_id
ORDER BY p.id;

-- 2. 統計各種狀態的照片數量
SELECT 
    '總照片數' as "類型",
    COUNT(*) as "數量"
FROM photos
UNION ALL
SELECT 
    '有圖片URL的照片',
    COUNT(*) 
FROM photos 
WHERE image_url IS NOT NULL AND image_url != ''
UNION ALL
SELECT 
    '無圖片URL的照片（異常）',
    COUNT(*) 
FROM photos 
WHERE image_url IS NULL OR image_url = ''
UNION ALL
SELECT 
    '有上傳者的照片',
    COUNT(*) 
FROM photos 
WHERE user_id IS NOT NULL
UNION ALL
SELECT 
    '無上傳者的照片（異常）',
    COUNT(*) 
FROM photos 
WHERE user_id IS NULL
UNION ALL
SELECT 
    '公開照片',
    COUNT(*) 
FROM photos 
WHERE is_public = true
UNION ALL
SELECT 
    '隱私照片',
    COUNT(*) 
FROM photos 
WHERE is_public = false
UNION ALL
SELECT 
    '有投票的照片',
    COUNT(*) 
FROM photos 
WHERE vote_count > 0;

-- 3. 顯示投票記錄對應的照片
SELECT 
    v.photo_id as "照片ID",
    COUNT(*) as "票數",
    p.id IS NOT NULL as "照片存在",
    p.image_url IS NOT NULL as "有圖片"
FROM votes v
LEFT JOIN photos p ON v.photo_id = p.id
GROUP BY v.photo_id, p.id, p.image_url
ORDER BY v.photo_id;

-- 4. 找出可能有問題的照片
SELECT 
    '異常照片清單' as "診斷";

-- 無圖片URL的照片
SELECT 
    id as "照片ID",
    user_id as "上傳者",
    created_at as "建立時間",
    '❌ 無圖片URL' as "問題"
FROM photos 
WHERE image_url IS NULL OR image_url = ''
UNION ALL
-- 無上傳者的照片
SELECT 
    id,
    user_id,
    created_at,
    '❌ 無上傳者' as "問題"
FROM photos 
WHERE user_id IS NULL
UNION ALL
-- 上傳者不存在的照片
SELECT 
    p.id,
    p.user_id,
    p.created_at,
    '❌ 上傳者不存在' as "問題"
FROM photos p
LEFT JOIN users u ON p.user_id = u.line_id
WHERE p.user_id IS NOT NULL AND u.line_id IS NULL
ORDER BY "照片ID";

-- 5. 檢查是否有孤立的投票記錄（照片已刪除但投票還在）
SELECT 
    v.id as "投票ID",
    v.photo_id as "照片ID",
    v.voter_line_id as "投票者",
    v.created_at as "投票時間",
    '❌ 照片不存在' as "問題"
FROM votes v
LEFT JOIN photos p ON v.photo_id = p.id
WHERE p.id IS NULL;

-- 6. 提供清理建議
DO $$
DECLARE
    invalid_photo_count INTEGER;
    orphaned_vote_count INTEGER;
BEGIN
    -- 計算無效照片數量
    SELECT COUNT(*) INTO invalid_photo_count
    FROM photos 
    WHERE image_url IS NULL OR image_url = '' OR user_id IS NULL;
    
    -- 計算孤立投票數量
    SELECT COUNT(*) INTO orphaned_vote_count
    FROM votes v
    LEFT JOIN photos p ON v.photo_id = p.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '診斷結果摘要';
    RAISE NOTICE '========================================';
    RAISE NOTICE '異常照片數量: %', invalid_photo_count;
    RAISE NOTICE '孤立投票記錄: %', orphaned_vote_count;
    RAISE NOTICE '';
    
    IF invalid_photo_count > 0 THEN
        RAISE NOTICE '⚠️ 發現 % 筆異常照片記錄', invalid_photo_count;
        RAISE NOTICE '建議：執行下面的清理 SQL 刪除這些記錄';
        RAISE NOTICE '';
    END IF;
    
    IF orphaned_vote_count > 0 THEN
        RAISE NOTICE '⚠️ 發現 % 筆孤立投票記錄', orphaned_vote_count;
        RAISE NOTICE '建議：執行下面的清理 SQL 刪除這些記錄';
        RAISE NOTICE '';
    END IF;
    
    IF invalid_photo_count = 0 AND orphaned_vote_count = 0 THEN
        RAISE NOTICE '✅ 資料庫狀態正常，沒有發現異常記錄';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- =============================================
-- 以下是清理 SQL（請根據上面的診斷結果決定是否執行）
-- =============================================

-- 警告：執行前請先確認上面的診斷結果！
-- 如果要執行清理，請取消下面的註解

/*
-- 清理步驟 1：刪除孤立的投票記錄（照片已不存在）
DELETE FROM votes v
WHERE NOT EXISTS (
    SELECT 1 FROM photos p WHERE p.id = v.photo_id
);

-- 清理步驟 2：刪除無圖片URL的照片
DELETE FROM photos 
WHERE image_url IS NULL OR image_url = '';

-- 清理步驟 3：刪除無上傳者的照片
DELETE FROM photos 
WHERE user_id IS NULL;

-- 清理步驟 4：刪除上傳者已不存在的照片
DELETE FROM photos p
WHERE p.user_id IS NOT NULL 
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.line_id = p.user_id
  );

-- 清理完成後，重新統計
SELECT 
    '清理後照片總數' as "項目",
    COUNT(*) as "數量"
FROM photos
UNION ALL
SELECT 
    '清理後投票總數',
    COUNT(*)
FROM votes;
*/

-- 驗證：顯示清理後的照片列表
SELECT 
    p.id as "照片ID",
    u.display_name as "上傳者",
    p.is_public as "公開",
    p.vote_count as "票數",
    COUNT(v.id) as "實際票數",
    CASE 
        WHEN p.vote_count = COUNT(v.id) THEN '✅'
        ELSE '❌ 不一致'
    END as "狀態"
FROM photos p
LEFT JOIN users u ON p.user_id = u.line_id
LEFT JOIN votes v ON v.photo_id = p.id
GROUP BY p.id, u.display_name, p.is_public, p.vote_count
ORDER BY p.id;

