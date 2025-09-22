-- 遷移用戶頭像數據
-- 將 picture_url 數據複製到 avatar_url 欄位

-- 如果 picture_url 欄位存在，將數據複製到 avatar_url
DO $$
BEGIN
    -- 檢查 picture_url 欄位是否存在
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'picture_url') THEN
        
        -- 確保 avatar_url 欄位存在
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        
        -- 將 picture_url 數據複製到 avatar_url（如果 avatar_url 為空）
        UPDATE users 
        SET avatar_url = picture_url 
        WHERE picture_url IS NOT NULL 
        AND (avatar_url IS NULL OR avatar_url = '');
        
        -- 可選：刪除舊的 picture_url 欄位（取消註解以執行）
        -- ALTER TABLE users DROP COLUMN IF EXISTS picture_url;
        
        RAISE NOTICE 'Avatar URL migration completed';
    ELSE
        RAISE NOTICE 'picture_url column does not exist, no migration needed';
    END IF;
END $$;
