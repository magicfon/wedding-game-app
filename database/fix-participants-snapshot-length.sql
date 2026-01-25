-- 修復 participants_snapshot 欄位長度問題
-- 將 participants_snapshot 欄位改為 TEXT 類型，避免長度限制

-- 檢查當前欄位類型
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lottery_history' 
AND column_name = 'participants_snapshot';

-- 修改 participants_snapshot 欄位為 TEXT 類型（如果需要）
-- 注意：如果欄位已經是 JSONB，這個語句不會執行
DO $$
BEGIN
    -- 檢查欄位類型是否為 JSONB
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'participants_snapshot'
        AND data_type = 'jsonb'
    ) THEN
        RAISE NOTICE '✅ participants_snapshot 已經是 JSONB 類型，無需修改';
    ELSE
        -- 將欄位改為 TEXT 類型
        ALTER TABLE lottery_history 
        ALTER COLUMN participants_snapshot TYPE TEXT USING participants_snapshot::TEXT;
        RAISE NOTICE '✅ 已將 participants_snapshot 改為 TEXT 類型';
    END IF;
END $$;

-- 驗證修改
SELECT 
    '修改後的 participants_snapshot 欄位' as check_item,
    column_name,
    data_type,
    character_maximum_length,
    CASE 
        WHEN data_type = 'jsonb' THEN '✅ JSONB（無長度限制）'
        WHEN data_type = 'text' THEN '✅ TEXT（無長度限制）'
        ELSE '⚠️ 其他類型'
    END as status
FROM information_schema.columns 
WHERE table_name = 'lottery_history' 
AND column_name = 'participants_snapshot';
