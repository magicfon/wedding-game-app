## MODIFIED Requirements

### Requirement: Photo Display Order
照片牆 SHALL 繼續按時間順序顯示照片，包括多張照片上傳的群組。

#### Scenario: Multiple photos from same upload group
- **WHEN** 用戶查看照片牆
- **THEN** 系統按上傳時間順序顯示所有照片
- **AND** 同一群組的照片按序號順序顯示
- **AND** 每張照片顯示帶序號的祝福語
- **AND** 照片牆的排序邏輯保持不變

#### Scenario: Photo wall pagination
- **WHEN** 照片牆使用分頁載入
- **THEN** 系統正確處理同群組照片的分頁
- **AND** 系統保持時間順序的一致性
- **AND** 系統不會分離同群組的照片

### Requirement: Photo Voting with Multiple Photos
照片投票功能 SHALL 正常處理多張照片上傳的每張照片。

#### Scenario: Voting on photos from same group
- **WHEN** 用戶對同群組的照片投票
- **THEN** 系統將每張照片視為獨立的投票對象
- **AND** 系統記錄每張照片的投票數
- **AND** 系統正確計算上傳者的總投票數
- **AND** 系統防止對同一張照片重複投票

#### Scenario: Vote count calculation
- **WHEN** 系統計算用戶總分
- **THEN** 系統包含所有照片的投票數
- **AND** 系統正確處理同群組照片的投票
- **AND** 系統保持現有的分數計算邏輯

### Requirement: Photo Information Display
照片資訊顯示 SHALL 包含多張照片上傳的相關資訊。

#### Scenario: Displaying blessing messages
- **WHEN** 照片牆顯示照片的祝福語
- **THEN** 系統顯示帶序號的完整祝福語
- **AND** 系統正確顯示 "(1/3)" 等序號標記
- **AND** 系統處理沒有祝福語的情況
- **AND** 系統保持祝福語顯示的格式一致性

#### Scenario: Photo metadata display
- **WHEN** 照片牆顯示照片元資料
- **THEN** 系統顯示正確的上傳時間
- **AND** 系統顯示上傳者資訊
- **AND** 系統不暴露內部的群組 ID
- **AND** 系統保持現有的顯示格式

### Requirement: Photo Wall Performance
照片牆效能 SHALL 在多張照片上傳功能下保持良好。

#### Scenario: Loading photos with groups
- **WHEN** 照片牆載入大量照片
- **THEN** 系統使用有效的查詢優化
- **AND** 系統利用群組 ID 的索引
- **AND** 系統保持現有的載入效能
- **AND** 系統正確處理縮圖載入

#### Scenario: Real-time updates
- **WHEN** 新的多張照片被上傳
- **THEN** 系統即時更新照片牆
- **AND** 系統正確顯示所有新照片
- **AND** 系統保持即時更新的效能
- **AND** 系統不會重複顯示照片