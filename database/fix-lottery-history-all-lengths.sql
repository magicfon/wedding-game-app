-- 修復 lottery_history 表所有欄位的長度限制問題
-- 將所有可能長度超過限制的欄位改為 TEXT 類型

-- 檢查當前欄位類型和長度限制
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lottery_history'
ORDER BY ordinal_position;

-- 修改所有 VARCHAR 欄位為 TEXT 類型，避免長度限制
DO $$
BEGIN
    -- 檢查並修改 winner_line_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'winner_line_id'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN winner_line_id TYPE TEXT USING winner_line_id::TEXT;
        RAISE NOTICE '✅ 已將 winner_line_id 改為 TEXT 類型';
    END IF;

    -- 檢查並修改 winner_display_name
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'winner_display_name'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN winner_display_name TYPE TEXT USING winner_display_name::TEXT;
        RAISE NOTICE '✅ 已將 winner_display_name 改為 TEXT 類型';
    END IF;

    -- 檢查並修改 winner_avatar_url
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'winner_avatar_url'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN winner_avatar_url TYPE TEXT USING winner_avatar_url::TEXT;
        RAISE NOTICE '✅ 已將 winner_avatar_url 改為 TEXT 類型';
    END IF;

    -- 檢查並修改 admin_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'admin_id'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;
        RAISE NOTICE '✅ 已將 admin_id 改為 TEXT 類型';
    END IF;

    -- 檢查並修改 admin_name
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'admin_name'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN admin_name TYPE TEXT USING admin_name::TEXT;
        RAISE NOTICE '✅ 已將 admin_name 改為 TEXT 類型';
    END IF;

    -- 檢查並修改 winner_photo_url
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'winner_photo_url'
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN winner_photo_url TYPE TEXT USING winner_photo_url::TEXT;
        RAISE NOTICE '✅ 已將 winner_photo_url 改為 TEXT 類型';
    END IF;

    -- 檢查並修改 participants_snapshot
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lottery_history' 
        AND column_name = 'participants_snapshot'
        AND data_type != 'jsonb'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE lottery_history 
        ALTER COLUMN participants_snapshot TYPE TEXT USING participants_snapshot::TEXT;
        RAISE NOTICE '✅ 已將 participants_snapshot 改為 TEXT 類型';
    END IF;
END $$;

-- 驗證修改
SELECT 
    '修改後的欄位' as check_item,
    column_name,
    data_type,
    character_maximum_length,
    CASE 
        WHEN data_type = 'text' THEN '✅ TEXT（無長度限制）'
        WHEN data_type = 'jsonb' THEN '✅ JSONB（無長度限制）'
        WHEN data_type = 'character varying' THEN '⚠️ VARCHAR（有長度限制）'
        ELSE '✅ 其他'
    END as status
FROM information_schema.columns 
WHERE table_name = 'lottery_history'
ORDER BY ordinal_position;
