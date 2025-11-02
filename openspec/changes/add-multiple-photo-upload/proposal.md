## Why
為了提升用戶體驗，讓賓客能夠一次上傳多張照片並分享祝福，增強婚禮互動遊戲的參與度和趣味性，同時避免資料庫結構變更以降低部署風險。

## What Changes
- 新增多張照片上傳功能，預設最多3張照片
- 為每張照片的祝福語添加序號標記 (1/3)、(2/3)、(3/3)
- 新增系統設定管理，允許管理員控制最大上傳張數（使用記憶體/環境變數）
- 修改照片上傳介面，支援多選和預覽
- 更新照片牆顯示邏輯，保持按時間排序
- **不修改資料庫結構**，通過應用層邏輯實現功能

## Impact
- Affected specs: photo-upload, system-settings, photo-wall
- Affected code: src/app/photo-upload/page.tsx, src/app/api/photo/upload/route.ts
- **無資料庫變更**：保持現有資料庫結構不變
- 新增系統設定管理：使用記憶體快取和環境變數