## MODIFIED Requirements
### Requirement: 後台頁面導航統一
所有後台管理頁面 SHALL 使用統一的導航結構和佈局模式。

#### Scenario: 管理員頁面佈局遷移
- **WHEN** 系統載入任何管理員頁面
- **THEN** 頁面 SHALL 使用 AdminLayout 組件包裝
- **AND** 移除原有的自定義 header 實現
- **AND** 保持原有的頁面功能和內容不變

#### Scenario: 頁面標題傳遞機制
- **WHEN** 管理員頁面使用 AdminLayout
- **THEN** 頁面標題 SHALL 通過 title 屬性傳遞給 AdminLayout
- **AND** AdminLayout SHALL 在頂部欄顯示正確的頁面標題
- **AND** 保持與原有標題顯示的一致性

## REMOVED Requirements
### Requirement: 獨立頁面 Header 實現
各管理頁面 SHALL 不再實現獨立的 header 組件。

**原因**: 統一使用 AdminLayout 可以減少代碼重複，提高維護性
**遷移**: 將 header 功能遷移到 AdminLayout 組件，通過屬性傳遞頁面特定信息

#### Scenario: 移除重複的 Header 代碼
- **WHEN** 管理員頁面遷移到 AdminLayout
- **THEN** 原有的 header 代碼 SHALL 被移除
- **AND** 相關的導航邏輯 SHALL 整合到 AdminLayout
- **AND** 保持用戶體驗的連續性