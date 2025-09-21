-- 簡化的問題表格修復腳本
-- 只添加最基本的必要欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查並添加基本欄位
DO $$ 
BEGIN
    -- 檢查 time_limit 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'time_limit') THEN
        ALTER TABLE questions ADD COLUMN time_limit INTEGER DEFAULT 30;
    END IF;

    -- 檢查 penalty_enabled 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'penalty_enabled') THEN
        ALTER TABLE questions ADD COLUMN penalty_enabled BOOLEAN DEFAULT false;
    END IF;

    -- 檢查 penalty_score 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'penalty_score') THEN
        ALTER TABLE questions ADD COLUMN penalty_score INTEGER DEFAULT 0;
    END IF;

    -- 檢查 timeout_penalty_enabled 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'timeout_penalty_enabled') THEN
        ALTER TABLE questions ADD COLUMN timeout_penalty_enabled BOOLEAN DEFAULT false;
    END IF;

    -- 檢查 timeout_penalty_score 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'timeout_penalty_score') THEN
        ALTER TABLE questions ADD COLUMN timeout_penalty_score INTEGER DEFAULT 0;
    END IF;

    -- 檢查 speed_bonus_enabled 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'speed_bonus_enabled') THEN
        ALTER TABLE questions ADD COLUMN speed_bonus_enabled BOOLEAN DEFAULT true;
    END IF;

    -- 檢查 max_bonus_points 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'max_bonus_points') THEN
        ALTER TABLE questions ADD COLUMN max_bonus_points INTEGER DEFAULT 5;
    END IF;

    -- 檢查 created_by 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'created_by') THEN
        ALTER TABLE questions ADD COLUMN created_by TEXT;
    END IF;

    -- 檢查 updated_at 欄位是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'updated_at') THEN
        ALTER TABLE questions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. 創建更新觸發器（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 刪除舊觸發器並創建新的
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. 檢查表格結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
ORDER BY ordinal_position;

-- 完成訊息
SELECT '問題表格基本欄位添加完成！' as message;
