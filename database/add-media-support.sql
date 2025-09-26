-- 為題目表新增圖片和影片支援
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 新增媒體相關欄位到 questions 表
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS media_alt_text TEXT,
ADD COLUMN IF NOT EXISTS media_duration INTEGER; -- 影片長度（秒）

-- 2. 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_questions_media_type ON questions(media_type);

-- 3. 更新現有題目為文字類型（如果還沒設定）
UPDATE questions 
SET media_type = 'text' 
WHERE media_type IS NULL;

-- 4. 新增註解
COMMENT ON COLUMN questions.media_type IS '媒體類型: text(純文字), image(圖片), video(影片)';
COMMENT ON COLUMN questions.media_url IS '媒體檔案URL';
COMMENT ON COLUMN questions.media_thumbnail_url IS '媒體縮圖URL（影片使用）';
COMMENT ON COLUMN questions.media_alt_text IS '媒體替代文字（無障礙支援）';
COMMENT ON COLUMN questions.media_duration IS '影片長度（秒）';

-- 5. 檢查結果
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    '✅ 欄位已新增' as status
FROM information_schema.columns 
WHERE table_name = 'questions' 
AND column_name IN ('media_type', 'media_url', 'media_thumbnail_url', 'media_alt_text', 'media_duration')
ORDER BY column_name;

-- 6. 檢查現有題目狀態
SELECT 
    id,
    question_text,
    media_type,
    media_url,
    CASE 
        WHEN media_type = 'text' THEN '📝 純文字題目'
        WHEN media_type = 'image' THEN '🖼️ 圖片題目'
        WHEN media_type = 'video' THEN '🎥 影片題目'
        ELSE '❓ 未知類型'
    END as 題目類型
FROM questions 
ORDER BY id;

-- 7. 統計各類型題目數量
SELECT 
    media_type as 媒體類型,
    COUNT(*) as 題目數量,
    CASE 
        WHEN media_type = 'text' THEN '📝'
        WHEN media_type = 'image' THEN '🖼️'
        WHEN media_type = 'video' THEN '🎥'
        ELSE '❓'
    END as 圖示
FROM questions 
GROUP BY media_type 
ORDER BY media_type;
