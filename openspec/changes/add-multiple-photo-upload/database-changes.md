# 資料庫變更腳本

## 多張照片上傳功能資料庫變更

### 1. 為 photos 表添加多張照片上傳支援欄位

```sql
-- 為 photos 表添加多張照片上傳相關欄位
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS upload_group_id TEXT,
ADD COLUMN IF NOT EXISTS photo_sequence INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS blessing_message_with_sequence TEXT;

-- 添加索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_photos_upload_group_id ON photos(upload_group_id);
CREATE INDEX IF NOT EXISTS idx_photos_group_sequence ON photos(upload_group_id, photo_sequence);
```

### 2. 創建系統設定表

```sql
-- 創建系統設定表
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設設定值
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('max_photo_upload_count', '3', 'integer', '最大照片上傳數量')
ON CONFLICT (setting_key) DO NOTHING;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
```

### 3. 創建觸發器自動更新 updated_at

```sql
-- 為 system_settings 表創建 updated_at 觸發器
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. 創建函數獲取最大照片上傳數量

```sql
-- 創建函數獲取最大照片上傳數量
CREATE OR REPLACE FUNCTION get_max_photo_upload_count()
RETURNS INTEGER AS $$
DECLARE
    max_count INTEGER;
BEGIN
    SELECT CAST(setting_value AS INTEGER) 
    INTO max_count 
    FROM system_settings 
    WHERE setting_key = 'max_photo_upload_count';
    
    -- 如果沒有設定，返回預設值 3
    IF max_count IS NULL OR max_count <= 0 THEN
        RETURN 3;
    END IF;
    
    -- 確保不超過最大限制 10
    IF max_count > 10 THEN
        RETURN 10;
    END IF;
    
    RETURN max_count;
END;
$$ LANGUAGE plpgsql;
```

### 5. 創建函數生成祝福語序號

```sql
-- 創建函數為祝福語添加序號
CREATE OR REPLACE FUNCTION add_blessing_sequence(
    base_message TEXT,
    sequence_num INTEGER,
    total_photos INTEGER
) RETURNS TEXT AS $$
BEGIN
    -- 如果沒有祝福語，返回空字串
    IF base_message IS NULL OR TRIM(base_message) = '' THEN
        RETURN NULL;
    END IF;
    
    -- 如果只有一張照片，不添加序號
    IF total_photos <= 1 THEN
        RETURN base_message;
    END IF;
    
    -- 添加序號
    RETURN CONCAT(base_message, ' (', sequence_num, '/', total_photos, ')');
END;
$$ LANGUAGE plpgsql;
```

### 6. 創建觸發器自動處理祝福語序號

```sql
-- 創建觸發器自動處理祝福語序號
CREATE OR REPLACE FUNCTION process_blessing_message_sequence()
RETURNS TRIGGER AS $$
DECLARE
    group_total INTEGER;
    processed_message TEXT;
BEGIN
    -- 如果沒有群組 ID，直接返回
    IF NEW.upload_group_id IS NULL THEN
        NEW.photo_sequence := 1;
        NEW.blessing_message_with_sequence := NEW.blessing_message;
        RETURN NEW;
    END IF;
    
    -- 計算群組中的照片總數
    SELECT COUNT(*) 
    INTO group_total 
    FROM photos 
    WHERE upload_group_id = NEW.upload_group_id;
    
    -- 處理祝福語序號
    processed_message := add_blessing_sequence(
        NEW.blessing_message, 
        NEW.photo_sequence, 
        group_total
    );
    
    NEW.blessing_message_with_sequence := processed_message;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS trigger_process_blessing_message_sequence ON photos;
CREATE TRIGGER trigger_process_blessing_message_sequence
    BEFORE INSERT OR UPDATE OF blessing_message, photo_sequence ON photos
    FOR EACH ROW EXECUTE FUNCTION process_blessing_message_sequence();
```

### 7. 更新現有照片記錄

```sql
-- 為現有照片設定預設值
UPDATE photos 
SET 
    upload_group_id = CONCAT('legacy_', id),
    photo_sequence = 1,
    blessing_message_with_sequence = blessing_message
WHERE upload_group_id IS NULL;
```

### 8. 添加欄位註釋

```sql
-- 添加欄位註釋
COMMENT ON COLUMN photos.upload_group_id IS '照片上傳群組 ID，用於識別同一次上傳的多張照片';
COMMENT ON COLUMN photos.photo_sequence IS '照片在群組中的序號';
COMMENT ON COLUMN photos.blessing_message_with_sequence IS '帶序號的祝福語，用於顯示';

COMMENT ON TABLE system_settings IS '系統設定表，儲存可配置的系統參數';
COMMENT ON COLUMN system_settings.setting_key IS '設定鍵值';
COMMENT ON COLUMN system_settings.setting_value IS '設定值';
COMMENT ON COLUMN system_settings.setting_type IS '設定值類型 (string, integer, boolean)';
COMMENT ON COLUMN system_settings.description IS '設定描述';
```

### 9. 創建 RLS 政策

```sql
-- 為 system_settings 表啟用 RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 政策
CREATE POLICY "Anyone can view system settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update system settings" ON system_settings FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE username = current_setting('app.current_admin_username', true)
    )
);
CREATE POLICY "Only admins can insert system settings" ON system_settings FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE username = current_setting('app.current_admin_username', true)
    )
);
```

### 10. 驗證腳本

```sql
-- 驗證資料庫變更
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'photos' 
AND column_name IN ('upload_group_id', 'photo_sequence', 'blessing_message_with_sequence')
ORDER BY column_name;

-- 驗證系統設定表
SELECT 
    setting_key, 
    setting_value, 
    setting_type, 
    description
FROM system_settings
WHERE setting_key = 'max_photo_upload_count';

-- 驗證函數存在
SELECT 
    proname as function_name,
    prosrc as function_definition
FROM pg_proc 
WHERE proname IN ('get_max_photo_upload_count', 'add_blessing_sequence', 'process_blessing_message_sequence');
```

## 回滾腳本

如果需要回滾這些變更，可以使用以下腳本：

```sql
-- 移除觸發器
DROP TRIGGER IF EXISTS trigger_process_blessing_message_sequence ON photos;

-- 移除函數
DROP FUNCTION IF EXISTS process_blessing_message_sequence();
DROP FUNCTION IF EXISTS add_blessing_sequence(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_max_photo_upload_count();

-- 移除索引
DROP INDEX IF EXISTS idx_photos_upload_group_id;
DROP INDEX IF EXISTS idx_photos_group_sequence;
DROP INDEX IF EXISTS idx_system_settings_key;

-- 移除 RLS 政策
DROP POLICY IF EXISTS "Anyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can insert system settings" ON system_settings;

-- 移除系統設定表
DROP TABLE IF EXISTS system_settings;

-- 移除照片表的新增欄位
ALTER TABLE photos 
DROP COLUMN IF EXISTS upload_group_id,
DROP COLUMN IF EXISTS photo_sequence,
DROP COLUMN IF EXISTS blessing_message_with_sequence;