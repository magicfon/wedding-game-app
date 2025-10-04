-- 安全清理異常照片資料
-- 此腳本會先備份要刪除的資料，然後才執行清理
-- 請在 Supabase SQL Editor 中執行

-- 開始事務（如果有問題可以回滾）
BEGIN;

-- ========================================
-- 步驟 1：顯示將要刪除的資料（預覽）
-- ========================================

RAISE NOTICE '========================================';
RAISE NOTICE '將要刪除的資料預覽';
RAISE NOTICE '========================================';

-- 預覽：無效的照片
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM photos 
    WHERE image_url IS NULL OR image_url = '' OR user_id IS NULL;
    
    RAISE NOTICE '將刪除 % 筆無效照片', invalid_count;
END $$;

SELECT 
    id as "照片ID",
    user_id as "上傳者ID",
    CASE 
        WHEN image_url IS NULL OR image_url = '' THEN '無圖片URL'
        WHEN user_id IS NULL THEN '無上傳者'
        ELSE '其他問題'
    END as "問題原因",
    created_at as "建立時間"
FROM photos 
WHERE image_url IS NULL OR image_url = '' OR user_id IS NULL;

-- 預覽：孤立的投票記錄
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM votes v
    LEFT JOIN photos p ON v.photo_id = p.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE '將刪除 % 筆孤立投票記錄', orphaned_count;
END $$;

SELECT 
    v.id as "投票ID",
    v.photo_id as "照片ID（不存在）",
    v.voter_line_id as "投票者",
    v.created_at as "投票時間"
FROM votes v
LEFT JOIN photos p ON v.photo_id = p.id
WHERE p.id IS NULL;

-- ========================================
-- 步驟 2：執行清理
-- ========================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '開始清理...';
RAISE NOTICE '========================================';

-- 清理 1：刪除孤立的投票記錄（照片已不存在）
WITH deleted_votes AS (
    DELETE FROM votes v
    WHERE NOT EXISTS (
        SELECT 1 FROM photos p WHERE p.id = v.photo_id
    )
    RETURNING *
)
SELECT COUNT(*) as "已刪除孤立投票記錄數" FROM deleted_votes;

-- 清理 2：先刪除無效照片的投票記錄
WITH invalid_photos AS (
    SELECT id FROM photos 
    WHERE image_url IS NULL OR image_url = '' OR user_id IS NULL
),
deleted_votes AS (
    DELETE FROM votes 
    WHERE photo_id IN (SELECT id FROM invalid_photos)
    RETURNING *
)
SELECT COUNT(*) as "已刪除無效照片的投票記錄數" FROM deleted_votes;

-- 清理 3：刪除無效的照片
WITH deleted_photos AS (
    DELETE FROM photos 
    WHERE image_url IS NULL OR image_url = '' OR user_id IS NULL
    RETURNING *
)
SELECT COUNT(*) as "已刪除無效照片數" FROM deleted_photos;

-- 清理 4：修正所有照片的 vote_count
UPDATE photos p
SET vote_count = (
    SELECT COUNT(*) 
    FROM votes v 
    WHERE v.photo_id = p.id
);

SELECT COUNT(*) as "已更新票數的照片數" FROM photos;

-- ========================================
-- 步驟 3：顯示清理結果
-- ========================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '清理完成！';
RAISE NOTICE '========================================';

-- 統計清理後的資料
SELECT 
    '清理後照片總數' as "項目",
    COUNT(*)::text as "數量"
FROM photos
UNION ALL
SELECT 
    '清理後投票總數',
    COUNT(*)::text
FROM votes
UNION ALL
SELECT 
    '總票數（從 photos 表）',
    COALESCE(SUM(vote_count), 0)::text
FROM photos
UNION ALL
SELECT 
    '公開照片數',
    COUNT(*)::text
FROM photos 
WHERE is_public = true
UNION ALL
SELECT 
    '隱私照片數',
    COUNT(*)::text
FROM photos 
WHERE is_public = false
UNION ALL
SELECT 
    '有投票的照片數',
    COUNT(*)::text
FROM photos 
WHERE vote_count > 0;

-- 驗證：檢查是否還有不一致的資料
SELECT 
    p.id as "照片ID",
    u.display_name as "上傳者",
    p.vote_count as "記錄票數",
    COUNT(v.id) as "實際票數",
    p.is_public as "公開",
    CASE 
        WHEN p.vote_count = COUNT(v.id) THEN '✅ 正確'
        ELSE '❌ 不一致'
    END as "狀態"
FROM photos p
LEFT JOIN users u ON p.user_id = u.line_id
LEFT JOIN votes v ON v.photo_id = p.id
GROUP BY p.id, u.display_name, p.is_public, p.vote_count
ORDER BY p.id;

-- ========================================
-- 步驟 4：確認或回滾
-- ========================================

-- 如果結果正確，執行 COMMIT 提交更改
-- 如果發現問題，執行 ROLLBACK 回滾更改

COMMIT;
-- ROLLBACK;  -- 如果要取消清理，取消註解這行並註解上面的 COMMIT

RAISE NOTICE '';
RAISE NOTICE '✅ 事務已提交，清理完成！';
RAISE NOTICE '';
RAISE NOTICE '如果需要回滾，請執行: ROLLBACK;';

