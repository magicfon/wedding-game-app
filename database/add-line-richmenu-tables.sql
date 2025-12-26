-- LINE Rich Menu Tables Migration
-- This migration adds tables for managing LINE Rich Menu tabs and user states

-- Rich Menu 全域設定表
CREATE TABLE IF NOT EXISTS line_richmenu_settings (
    id SERIAL PRIMARY KEY,
    default_tab VARCHAR(50) NOT NULL DEFAULT 'venue_info' CHECK (default_tab IN ('venue_info', 'activity')),
    venue_tab_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    activity_tab_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用戶 Rich Menu 狀態表
CREATE TABLE IF NOT EXISTS line_richmenu_user_states (
    line_id VARCHAR(255) PRIMARY KEY REFERENCES users(line_id) ON DELETE CASCADE,
    current_tab VARCHAR(50) NOT NULL DEFAULT 'venue_info' CHECK (current_tab IN ('venue_info', 'activity')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rich Menu 註冊表（追蹤 LINE Platform 上的 Rich Menu ID）
CREATE TABLE IF NOT EXISTS line_richmenu_registry (
    id SERIAL PRIMARY KEY,
    menu_type VARCHAR(50) NOT NULL UNIQUE CHECK (menu_type IN ('venue_info', 'activity', 'unavailable')),
    richmenu_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設設定
INSERT INTO line_richmenu_settings (default_tab, venue_tab_enabled, activity_tab_enabled)
VALUES ('venue_info', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_richmenu_user_states_current_tab ON line_richmenu_user_states(current_tab);
CREATE INDEX IF NOT EXISTS idx_richmenu_registry_menu_type ON line_richmenu_registry(menu_type);

-- 建立觸發器自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_richmenu_settings_updated_at
    BEFORE UPDATE ON line_richmenu_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_richmenu_user_states_updated_at
    BEFORE UPDATE ON line_richmenu_user_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_richmenu_registry_updated_at
    BEFORE UPDATE ON line_richmenu_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE line_richmenu_settings IS 'LINE Rich Menu 全域設定，包含預設分頁和分頁啟用狀態';
COMMENT ON TABLE line_richmenu_user_states IS '用戶 Rich Menu 狀態，追蹤每個用戶的當前分頁';
COMMENT ON TABLE line_richmenu_registry IS 'Rich Menu 註冊表，追蹤 LINE Platform 上的 Rich Menu ID';

COMMENT ON COLUMN line_richmenu_settings.default_tab IS '預設開啟的分頁 (venue_info | activity)';
COMMENT ON COLUMN line_richmenu_settings.venue_tab_enabled IS '會場資訊分頁是否啟用';
COMMENT ON COLUMN line_richmenu_settings.activity_tab_enabled IS '現場活動分頁是否啟用';

COMMENT ON COLUMN line_richmenu_user_states.line_id IS '用戶 LINE ID';
COMMENT ON COLUMN line_richmenu_user_states.current_tab IS '用戶當前所在分頁';

COMMENT ON COLUMN line_richmenu_registry.menu_type IS 'Rich Menu 類型 (venue_info | activity | unavailable)';
COMMENT ON COLUMN line_richmenu_registry.richmenu_id IS 'LINE Platform 上的 Rich Menu ID';
