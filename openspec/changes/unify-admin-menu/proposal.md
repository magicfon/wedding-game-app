## Why
目前後台管理頁面使用了不一致的選單實現，有些頁面使用 AdminLayout 組件的漢堡選單，有些頁面有自定義的 header。此外，漢堡選單在電腦 Chrome 瀏覽器下顯示異常，與主內容分開。需要統一所有後台頁面的選單體驗，並修復顯示問題。

## What Changes
- 統一所有後台管理頁面使用 AdminLayout 組件
- 修復漢堡選單在桌面 Chrome 瀏覽器中的顯示問題
- 確保選單在所有設備上都能正常工作
- 移除各頁面重複的 header 代碼
- **BREAKING**: 需要修改多個頁面的佈局結構

## Impact
- Affected specs: admin-layout, navigation
- Affected code: 
  - 修改: src/components/AdminLayout.tsx
  - 修改: src/app/admin/dashboard/page.tsx
  - 修改: src/app/admin/questions/page.tsx  
  - 修改: src/app/admin/photos/page.tsx
  - 修改: 其他未使用 AdminLayout 的管理頁面