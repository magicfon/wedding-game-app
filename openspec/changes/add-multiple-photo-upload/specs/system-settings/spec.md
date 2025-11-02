## ADDED Requirements

### Requirement: System Settings Table
系統 SHALL 提供一個系統設定表來儲存可配置的參數。

#### Scenario: System settings initialization
- **WHEN** 系統首次部署
- **THEN** 系統創建 system_settings 表
- **AND** 系統插入預設設定值
- **AND** 系統確保設定表有適當的索引和約束

#### Scenario: System settings structure
- **WHEN** 查詢系統設定表
- **THEN** 表格包含 setting_key (主鍵)
- **AND** 表格包含 setting_value (值)
- **AND** 表格包含 setting_type (資料類型)
- **AND** 表格包含 description (設定描述)
- **AND** 表格包含 updated_at (更新時間)

### Requirement: Maximum Photo Upload Limit
系統 SHALL 允許管理員配置最大照片上傳數量。

#### Scenario: Default maximum photo limit
- **WHEN** 系統初始化
- **THEN** 系統設定預設最大上傳張數為 3
- **AND** 設定鍵為 'max_photo_upload_count'
- **AND** 設定值為 '3'
- **AND** 設定類型為 'integer'

#### Scenario: Admin updates photo limit
- **WHEN** 管理員修改最大上傳張數
- **THEN** 系統驗證新值為正整數
- **AND** 系統驗證新值在合理範圍內 (1-10)
- **AND** 系統更新設定值
- **AND** 系統記錄更新時間
- **AND** 系統返回更新確認

#### Scenario: Invalid photo limit value
- **WHEN** 管理員輸入無效的最大上傳張數
- **THEN** 系統拒絕設定更新
- **AND** 系統顯示具體的錯誤訊息
- **AND** 系統保持原有設定值
- **AND** 系統建議有效的數值範圍

### Requirement: System Settings API
系統 SHALL 提供 API 來讀取和更新系統設定。

#### Scenario: Read system settings
- **WHEN** 應用程式需要讀取系統設定
- **THEN** 系統提供讀取 API 端點
- **AND** API 返回所有設定或指定設定
- **AND** API 包含設定值的資料類型資訊
- **AND** API 驗證請求者權限

#### Scenario: Update system settings
- **WHEN** 管理員需要更新系統設定
- **THEN** 系統提供更新 API 端點
- **AND** API 驗證管理員權限
- **AND** API 驗證設定值的格式和範圍
- **AND** API 記錄設定變更日誌
- **AND** API 返回更新結果

#### Scenario: Get maximum photo upload limit
- **WHEN** 照片上傳功能需要知道最大張數限制
- **THEN** 系統提供專門的 API 端點
- **AND** API 返回當前的最大上傳張數
- **AND** API 提供預設值作為備用
- **AND** API 快取設定值以提升效能