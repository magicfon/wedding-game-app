## Why
照片牆功能目前直接載入原始高解析度圖片，導致初始載入時間過長，特別是在網路較慢的環境下。用戶體驗不佳，可能影響參與度。通過實施縮圖機制和漸進式載入技術，可以顯著提升載入性能，同時保持現有功能不變。

## What Changes
- 添加縮圖生成功能到照片上傳流程
- 實現漸進式載入效果到照片放大檢視
- 更新照片牆顯示使用縮圖而非原圖
- 添加舊照片遷移機制
- 保持向後相容性，不影響現有功能

## Impact
- Affected specs: photo-wall, photo-upload, photo-display
- Affected code: src/app/photo-wall/page.tsx, src/app/api/photo/upload/route.ts, src/app/api/photo/list/route.ts
- Database changes: 添加縮圖相關欄位到 photos 表
- Performance improvement: 預期載入時間減少 50% 以上
- User experience: 點擊照片立即顯示，無明顯等待時間