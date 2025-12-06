-- Add media_type column to photos table
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'image',
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Update existing records to have 'image' as media_type
UPDATE public.photos SET media_type = 'image' WHERE media_type IS NULL;

-- Create an index for faster filtering by media_type
CREATE INDEX IF NOT EXISTS idx_photos_media_type ON public.photos(media_type);
