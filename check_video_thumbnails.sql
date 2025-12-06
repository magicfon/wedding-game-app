-- 查詢所有影片及其縮圖資訊
SELECT 
  id,
  created_at,
  media_type,
  image_url,
  thumbnail_small_url,
  thumbnail_medium_url,
  thumbnail_large_url,
  blessing_message,
  user_id
FROM photos
WHERE media_type = 'video'
ORDER BY created_at DESC
LIMIT 10;
