-- 修復照片投票計數 Trigger
-- 請在 Supabase SQL Editor 中執行

-- 1. 檢查當前 trigger 狀態
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_photo_vote_count';

-- 2. 刪除舊的 trigger 和 function（如果存在）
DROP TRIGGER IF EXISTS trigger_update_photo_vote_count ON votes;
DROP FUNCTION IF EXISTS update_photo_vote_count();

-- 3. 創建更新照片投票數的函數（加入日誌和錯誤處理）
CREATE OR REPLACE FUNCTION update_photo_vote_count()
RETURNS TRIGGER AS $$
DECLARE
    photo_title TEXT;
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 獲取照片資訊
        SELECT vote_count INTO old_count
        FROM photos WHERE id = NEW.photo_id;
        
        -- 增加投票數
        UPDATE photos 
        SET vote_count = COALESCE(vote_count, 0) + 1 
        WHERE id = NEW.photo_id;
        
        -- 獲取更新後的投票數
        SELECT vote_count INTO new_count
        FROM photos WHERE id = NEW.photo_id;
        
        -- 記錄日誌
        RAISE NOTICE '[投票 Trigger] INSERT: 照片 % 投票數 % → %', 
                     NEW.photo_id, COALESCE(old_count, 0), new_count;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- 獲取照片資訊
        SELECT vote_count INTO old_count
        FROM photos WHERE id = OLD.photo_id;
        
        -- 減少投票數（確保不會小於 0）
        UPDATE photos 
        SET vote_count = GREATEST(COALESCE(vote_count, 0) - 1, 0)
        WHERE id = OLD.photo_id;
        
        -- 獲取更新後的投票數
        SELECT vote_count INTO new_count
        FROM photos WHERE id = OLD.photo_id;
        
        -- 記錄日誌
        RAISE NOTICE '[投票 Trigger] DELETE: 照片 % 投票數 % → %', 
                     OLD.photo_id, COALESCE(old_count, 0), new_count;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. 創建 trigger
CREATE TRIGGER trigger_update_photo_vote_count
    AFTER INSERT OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_photo_vote_count();

-- 5. 確認 trigger 已創建
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    '✅ Trigger 已創建' as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_photo_vote_count';

-- 6. 修正現有照片的投票數（根據 votes 表重新計算）
UPDATE photos p
SET vote_count = (
    SELECT COUNT(*) 
    FROM votes v 
    WHERE v.photo_id = p.id
);

-- 7. 顯示修正結果
SELECT 
    p.id as "照片 ID",
    p.vote_count as "當前票數",
    COUNT(v.id) as "計算票數",
    CASE 
        WHEN p.vote_count = COUNT(v.id) THEN '✅ 正確'
        ELSE '❌ 不一致'
    END as "狀態"
FROM photos p
LEFT JOIN votes v ON p.id = v.photo_id
GROUP BY p.id, p.vote_count
ORDER BY p.id;

-- 8. 測試 trigger
DO $$
DECLARE
    test_photo_id INTEGER;
    test_voter_id TEXT;
    test_user_display_name TEXT := 'Trigger測試用戶';
    initial_count INTEGER;
    after_insert_count INTEGER;
    after_delete_count INTEGER;
BEGIN
    -- 獲取第一張照片的 ID（用於測試）
    SELECT id INTO test_photo_id FROM photos LIMIT 1;
    
    IF test_photo_id IS NULL THEN
        RAISE NOTICE '❌ 沒有照片可供測試';
        RETURN;
    END IF;
    
    -- 生成測試用戶 ID
    test_voter_id := 'test_trigger_voter_' || extract(epoch from now())::text;
    
    -- 創建測試用戶（因為有外鍵約束）
    INSERT INTO users (line_id, display_name)
    VALUES (test_voter_id, test_user_display_name);
    
    RAISE NOTICE '✅ 已創建測試用戶: %', test_voter_id;
    
    -- 獲取初始票數
    SELECT vote_count INTO initial_count 
    FROM photos WHERE id = test_photo_id;
    
    RAISE NOTICE '🧪 開始測試投票 Trigger（照片 ID: %）...', test_photo_id;
    RAISE NOTICE '初始票數: %', initial_count;
    
    -- 測試 INSERT
    INSERT INTO votes (voter_line_id, photo_id)
    VALUES (test_voter_id, test_photo_id);
    
    SELECT vote_count INTO after_insert_count 
    FROM photos WHERE id = test_photo_id;
    
    IF after_insert_count = initial_count + 1 THEN
        RAISE NOTICE '✅ INSERT 測試成功！票數從 % 增加到 %', initial_count, after_insert_count;
    ELSE
        RAISE NOTICE '❌ INSERT 測試失敗！期望 %，實際 %', (initial_count + 1), after_insert_count;
    END IF;
    
    -- 測試 DELETE
    DELETE FROM votes 
    WHERE voter_line_id = test_voter_id AND photo_id = test_photo_id;
    
    SELECT vote_count INTO after_delete_count 
    FROM photos WHERE id = test_photo_id;
    
    IF after_delete_count = initial_count THEN
        RAISE NOTICE '✅ DELETE 測試成功！票數恢復為 %', after_delete_count;
    ELSE
        RAISE NOTICE '❌ DELETE 測試失敗！期望 %，實際 %', initial_count, after_delete_count;
    END IF;
    
    -- 清理測試用戶
    DELETE FROM users WHERE line_id = test_voter_id;
    
    RAISE NOTICE '🧹 測試完成，測試資料已清理';
END $$;

-- 9. 最終檢查
SELECT 
    '照片總數' as "項目", 
    COUNT(*)::text as "數量"
FROM photos
UNION ALL
SELECT 
    '投票總數' as "項目", 
    COUNT(*)::text as "數量"
FROM votes
UNION ALL
SELECT 
    '總票數（從 photos）' as "項目", 
    SUM(vote_count)::text as "數量"
FROM photos;

