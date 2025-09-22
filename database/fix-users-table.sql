-- 修復 users 表格缺少欄位的問題
-- 在 Supabase SQL Editor 中執行此腳本

-- 確保 users 表格有所有必要的欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 更新現有記錄的預設值（如果需要）
UPDATE users 
SET 
    total_score = COALESCE(total_score, 0),
    join_time = COALESCE(join_time, NOW()),
    is_active = COALESCE(is_active, TRUE),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE 
    total_score IS NULL 
    OR join_time IS NULL 
    OR is_active IS NULL 
    OR created_at IS NULL 
    OR updated_at IS NULL;
