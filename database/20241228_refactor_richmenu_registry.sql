-- Rich Menu Registry Schema Refactoring
-- This migration changes the registry to store all rich menus with optional menu_type

-- Step 1: Drop existing constraints and indexes
DROP INDEX IF EXISTS idx_richmenu_registry_menu_type;

-- Step 2: Create a new table with the correct schema
CREATE TABLE IF NOT EXISTS line_richmenu_registry_new (
    richmenu_id VARCHAR(255) PRIMARY KEY,
    menu_type VARCHAR(50) NULL CHECK (menu_type IS NULL OR menu_type IN ('venue_info', 'activity', 'unavailable')),
    name VARCHAR(255),
    has_image BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Migrate existing data
INSERT INTO line_richmenu_registry_new (richmenu_id, menu_type, name, has_image, created_at, updated_at)
SELECT 
    richmenu_id, 
    menu_type, 
    NULL as name,  -- Old table doesn't have name column
    COALESCE(has_image, FALSE) as has_image,
    COALESCE(created_at, NOW()) as created_at,
    COALESCE(updated_at, NOW()) as updated_at
FROM line_richmenu_registry
ON CONFLICT (richmenu_id) DO NOTHING;

-- Step 4: Drop old table and rename new table
DROP TABLE IF EXISTS line_richmenu_registry;
ALTER TABLE line_richmenu_registry_new RENAME TO line_richmenu_registry;

-- Step 5: Create partial unique index for menu_type (unique when NOT NULL, multiple NULLs allowed)
CREATE UNIQUE INDEX idx_richmenu_registry_menu_type_unique 
ON line_richmenu_registry(menu_type) 
WHERE menu_type IS NOT NULL;

-- Step 6: Create index for faster queries
CREATE INDEX idx_richmenu_registry_richmenu_id ON line_richmenu_registry(richmenu_id);

-- Step 7: Create trigger for updated_at
CREATE OR REPLACE TRIGGER trigger_update_richmenu_registry_updated_at
    BEFORE UPDATE ON line_richmenu_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Add comments
COMMENT ON TABLE line_richmenu_registry IS 'Rich Menu 註冊表，儲存所有 LINE Platform 上的 Rich Menu';
COMMENT ON COLUMN line_richmenu_registry.richmenu_id IS 'LINE Platform 上的 Rich Menu ID (Primary Key)';
COMMENT ON COLUMN line_richmenu_registry.menu_type IS 'Rich Menu 功能類型 (venue_info | activity | unavailable | NULL)，非 NULL 時不可重複';
COMMENT ON COLUMN line_richmenu_registry.name IS 'Rich Menu 名稱';
COMMENT ON COLUMN line_richmenu_registry.has_image IS '是否已上傳圖片';
