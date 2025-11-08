## Why
當前的照片上傳功能通過 Vercel Serverless Function 作為中間層，這導致了 5MB 的檔案大小限制，無法滿足用戶上傳高解析度照片的需求。為了提供更好的用戶體驗並支持無檔案大小限制的照片上傳，需要實現客戶端直接上傳到 Supabase Storage 的功能。

## What Changes
- 實現客戶端直接上傳到 Supabase Storage，繞過 Vercel Serverless Function 的檔案大小限制
- 對於超過 6MB 的大檔案，使用 Resumable Upload (基於 Tus 協議) 提高可靠性
- 上傳完成後，客戶端發送元數據（檔案 URL、檔名等）給後端 API 進行資料庫記錄
- 更新前端上傳組件以支援新的上傳流程
- 保持現有的上傳進度顯示和錯誤處理功能

## Impact
- Affected specs: photo-upload
- Affected code: 
  - `/src/app/api/photo/upload/route.ts` - 修改為只處理元數據
  - `/src/components/MediaUpload.tsx` - 更新上傳邏輯
  - `/src/lib/upload-with-progress.ts` - 實現直接上傳功能
  - `/src/app/photo-upload/page.tsx` - 更新上傳流程
  - 新增客戶端直接上傳工具函數