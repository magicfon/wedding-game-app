-- 新增 platform_surface_style 欄位到 lottery_machine_config 表
-- 這個欄位用於儲存中獎者平台表面的樣式（特別是高度）

ALTER TABLE lottery_machine_config
ADD COLUMN IF NOT EXISTS platform_surface_style JSONB NOT NULL DEFAULT '{"height": "clamp(60px, 6vh, 100px)"}';

-- 更新現有記錄的預設值
UPDATE lottery_machine_config
SET platform_surface_style = '{"height": "clamp(60px, 6vh, 100px)"}'
WHERE platform_surface_style IS NULL OR platform_surface_style = '{}';
