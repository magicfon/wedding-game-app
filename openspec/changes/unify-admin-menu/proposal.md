## Why
目前後台管理頁面使用了不一致的選單實現，有些頁面使用 AdminLayout 組件的漢堡選單，有些頁面有自定義的 header。此外，AdminLayout 組件的側邊欄選單在電腦 Chrome 瀏覽器下顯示異常，出現「左上右下」問題。需要統一所有後台頁面的選單體驗，並修復顯示問題。

經過分析，發現「照片上傳」頁面使用的 Layout 組件採用了覆蓋層（overlay）選單方式，這種方式簡單有效，沒有顯示問題。決定採用相同的方式重新設計 AdminLayout 組件。

## What Changes
- 重新設計 AdminLayout 組件，採用覆蓋層（overlay）選單方式，類似「照片上傳」頁面的 Layout 組件
- 移除側邊欄設計，改為全屏覆蓋的選單
- 統一所有後台管理頁面使用新的 AdminLayout 組件
- 確保選單在所有設備和瀏覽器上都能正常工作
- 移除各頁面重複的 header 代碼
- **BREAKING**: 需要修改多個頁面的佈局結構

## Impact
- Affected specs: admin-layout, navigation
- Affected code:
  - 完全重寫: src/components/AdminLayout.tsx
  - 修改: src/app/admin/dashboard/page.tsx
  - 修改: src/app/admin/questions/page.tsx
  - 修改: src/app/admin/photos/page.tsx
  - 修改: 其他未使用 AdminLayout 的管理頁面