## Why
當前照片牆功能直接顯示原始大小的高解析度照片，導致載入速度慢、頻寬消耗大，特別在行動網路環境下用戶體驗不佳。添加縮圖支援可以大幅提升照片牆的載入性能和用戶體驗。

## What Changes
- 為照片表添加縮圖相關欄位
- 實現自動縮圖生成功能
- 更新照片牆組件使用縮圖
- 添加縮圖管理 API
- **BREAKING**: 照片資料庫結構變更，需要遷移現有資料

## Impact
- Affected specs: media
- Affected code: src/components/MasonryPhotoWall.tsx, src/app/api/photo/upload/route.ts, database schema
- Performance improvement: 減少初始載入時間 60-80%
- Storage increase: 約增加 10-15% 存儲空間用於縮圖