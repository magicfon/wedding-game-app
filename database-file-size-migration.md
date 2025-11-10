# 資料庫遷移腳本 - 新增照片檔案大小欄位

## 概述

為 `photos` 表新增 `file_size` 欄位，用於儲存照片檔案大小資訊，支援照片管理介面的檔案大小顯示功能。

## 遷移腳本

```sql
-- 為 photos 表新增檔案大小欄位
-- 執行日期: 2024-01-XX
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 新增檔案大小欄位
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT NULL;

-- 2. 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_photos_file_size ON photos(file_size DESC) WHERE file_size IS NOT NULL;

-- 3. 新增註釋說明
COMMENT ON COLUMN photos.file_size IS '照片檔案大小（位元組）';

-- 4. 檢查欄位是否成功新增
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    '✅ 欄位已新增' as status
FROM information_schema.columns 
WHERE table_name = 'photos' 
AND column_name = 'file_size';

-- 5. 統計現有照片的檔案大小狀況
SELECT 
    COUNT(*) as total_photos,
    COUNT(file_size) as photos_with_size,
    COUNT(*) - COUNT(file_size) as photos_without_size
FROM photos;

-- 6. 建立檔案大小分類統計函數
CREATE OR REPLACE FUNCTION get_file_size_category(size_bytes BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF size_bytes IS NULL THEN
        RETURN '未知';
    ELSIF size_bytes < 1024 * 1024 THEN  -- 小於 1 MB
        RETURN '小檔案';
    ELSIF size_bytes < 5 * 1024 * 1024 THEN  -- 1-5 MB
        RETURN '中檔案';
    ELSIF size_bytes < 10 * 1024 * 1024 THEN  -- 5-10 MB
        RETURN '大檔案';
    ELSE
        RETURN '超大檔案';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 建立檔案大小格式化函數
CREATE OR REPLACE FUNCTION format_file_size(size_bytes BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF size_bytes IS NULL THEN
        RETURN '未知';
    ELSIF size_bytes < 1024 THEN
        RETURN size_bytes || ' B';
    ELSIF size_bytes < 1024 * 1024 THEN
        RETURN ROUND(size_bytes::NUMERIC / 1024, 1) || ' KB';
    ELSIF size_bytes < 1024 * 1024 * 1024 THEN
        RETURN ROUND(size_bytes::NUMERIC / (1024 * 1024), 1) || ' MB';
    ELSE
        RETURN ROUND(size_bytes::NUMERIC / (1024 * 1024 * 1024), 2) || ' GB';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. 建立儲存空間統計函數
CREATE OR REPLACE FUNCTION get_storage_statistics()
RETURNS TABLE(
    total_photos BIGINT,
    photos_with_size BIGINT,
    total_storage_bytes BIGINT,
    total_storage_formatted TEXT,
    average_size_bytes BIGINT,
    average_size_formatted TEXT,
    max_size_bytes BIGINT,
    max_size_formatted TEXT,
    min_size_bytes BIGINT,
    min_size_formatted TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_photos,
        COUNT(file_size) as photos_with_size,
        COALESCE(SUM(file_size), 0) as total_storage_bytes,
        format_file_size(COALESCE(SUM(file_size), 0)) as total_storage_formatted,
        COALESCE(AVG(file_size), 0)::BIGINT as average_size_bytes,
        format_file_size(COALESCE(AVG(file_size), 0)::BIGINT) as average_size_formatted,
        COALESCE(MAX(file_size), 0) as max_size_bytes,
        format_file_size(COALESCE(MAX(file_size), 0)) as max_size_formatted,
        COALESCE(MIN(file_size), 0) as min_size_bytes,
        format_file_size(COALESCE(MIN(file_size), 0)) as min_size_formatted
    FROM photos;
END;
$$ LANGUAGE plpgsql;

-- 9. 建立檔案大小分布統計函數
CREATE OR REPLACE FUNCTION get_file_size_distribution()
RETURNS TABLE(
    size_category TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        get_file_size_category(file_size) as size_category,
        COUNT(*) as count,
        ROUND(COUNT(*)::NUMERIC * 100 / (SELECT COUNT(*) FROM photos), 2) as percentage
    FROM photos
    GROUP BY get_file_size_category(file_size)
    ORDER BY 
        CASE get_file_size_category(file_size)
            WHEN '小檔案' THEN 1
            WHEN '中檔案' THEN 2
            WHEN '大檔案' THEN 3
            WHEN '超大檔案' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql;

-- 10. 測試函數
-- 測試檔案大小分類
SELECT 
    get_file_size_category(500 * 1024) as small_file,
    get_file_size_category(2 * 1024 * 1024) as medium_file,
    get_file_size_category(7 * 1024 * 1024) as large_file,
    get_file_size_category(15 * 1024 * 1024) as extra_large_file;

-- 測試檔案大小格式化
SELECT 
    format_file_size(500 * 1024) as small_formatted,
    format_file_size(2 * 1024 * 1024) as medium_formatted,
    format_file_size(7 * 1024 * 1024) as large_formatted,
    format_file_size(15 * 1024 * 1024) as extra_large_formatted;

-- 測試儲存空間統計
SELECT * FROM get_storage_statistics();

-- 測試檔案大小分布
SELECT * FROM get_file_size_distribution();
```

## 說明

### 新增欄位
- `file_size` (BIGINT): 儲存照片檔案大小，單位為位元組
- 允許 NULL 值，以支援現有沒有檔案大小資料的照片

### 新增索引
- `idx_photos_file_size`: 提升按檔案大小查詢的效能

### 新增函數
1. `get_file_size_category()`: 根據檔案大小返回分類（小檔案、中檔案、大檔案、超大檔案）
2. `format_file_size()`: 格式化檔案大小顯示（B、KB、MB、GB）
3. `get_storage_statistics()`: 返回儲存空間統計資訊
4. `get_file_size_distribution()`: 返回檔案大小分布統計

## 使用方式

### 1. 查詢照片列表（含檔案大小）
```sql
SELECT 
    id,
    image_url,
    blessing_message,
    is_public,
    vote_count,
    created_at,
    file_size,
    format_file_size(file_size) as file_size_formatted,
    get_file_size_category(file_size) as size_category
FROM photos
ORDER BY created_at DESC;
```

### 2. 獲取儲存空間統計
```sql
SELECT * FROM get_storage_statistics();
```

### 3. 獲取檔案大小分布
```sql
SELECT * FROM get_file_size_distribution();
```

### 4. 按檔案大小排序
```sql
SELECT 
    id,
    image_url,
    file_size,
    format_file_size(file_size) as file_size_formatted
FROM photos
WHERE file_size IS NOT NULL
ORDER BY file_size DESC;
```

## 注意事項

1. **向後相容性**: 現有照片的 `file_size` 欄位將為 NULL，需要透過其他方式補充資料
2. **效能考量**: 新增的索引會提升查詢效能，但會增加寫入時間
3. **資料完整性**: 建議在照片上傳時確保檔案大小資料被正確記錄

## 後續步驟

1. 更新照片上傳 API，確保新上傳的照片包含檔案大小資訊
2. 更新照片管理介面，顯示檔案大小資訊
3. 考慮為現有照片補充檔案大小資料（可選）