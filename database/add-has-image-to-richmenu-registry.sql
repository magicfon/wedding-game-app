-- Add has_image column to line_richmenu_registry table
-- This migration adds a column to track whether a rich menu has an image uploaded

ALTER TABLE line_richmenu_registry 
ADD COLUMN IF NOT EXISTS has_image BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN line_richmenu_registry.has_image IS 'Whether the rich menu has an image uploaded';
