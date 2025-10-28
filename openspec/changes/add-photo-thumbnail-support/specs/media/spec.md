## ADDED Requirements

### Requirement: Photo Thumbnail Generation
系統 SHALL 為所有上傳的照片自動生成多種尺寸的縮圖。

#### Scenario: Successful thumbnail generation
- **WHEN** 用戶上傳照片
- **THEN** 系統自動生成小 (200px)、中 (400px)、大 (800px) 三種尺寸的縮圖
- **AND** 縮圖儲存在 Supabase Storage 的專用資料夾
- **AND** 縮圖 URL 記錄在 photos 表中

#### Scenario: Thumbnail generation fallback
- **WHEN** 縮圖生成失敗
- **THEN** 系統記錄錯誤日誌
- **AND** 使用原始照片作為回退
- **AND** 後台重試機制嘗試重新生成

### Requirement: Responsive Photo Display
照片牆 SHALL 根據設備和網路條件智能選擇適當的圖片尺寸。

#### Scenario: Mobile device photo loading
- **WHEN** 用戶在行動設備上查看照片牆
- **THEN** 系統優先載入小尺寸縮圖 (200px)
- **AND** 點擊時載入中等尺寸縮圖 (400px)
- **AND** 長按或雙擊時載入原始圖片

#### Scenario: Desktop device photo loading
- **WHEN** 用戶在桌面設備上查看照片牆
- **THEN** 系統載入中等尺寸縮圖 (400px)
- **AND** 懸停時預載入大尺寸縮圖 (800px)
- **AND** 點擊時載入原始圖片

### Requirement: Thumbnail Management API
系統 SHALL 提供縮圖管理的 API 端點。

#### Scenario: Manual thumbnail regeneration
- **WHEN** 管理員請求重新生成縮圖
- **THEN** 系統驗證管理員權限
- **AND** 重新生成指定照片的所有縮圖
- **AND** 返回生成結果和統計資訊

#### Scenario: Thumbnail cleanup
- **WHEN** 原始照片被刪除
- **THEN** 系統自動刪除相關的所有縮圖
- **AND** 清理 photos 表中的縮圖記錄
- **AND** 釋放存儲空間

## MODIFIED Requirements

### Requirement: Photo Upload Process
照片上傳流程 SHALL 包含縮圖生成步驟。

#### Scenario: Enhanced photo upload
- **WHEN** 用戶上傳照片
- **THEN** 系統驗證照片格式和大小
- **AND** 儲存原始照片到 Supabase Storage
- **AND** 自動生成多種尺寸的縮圖
- **AND** 更新 photos 表包含縮圖資訊
- **AND** 返回包含所有圖片 URL 的回應

#### Scenario: Upload progress indication
- **WHEN** 照片上傳和縮圖生成進行中
- **THEN** 系統顯示上傳進度
- **AND** 顯示縮圖生成狀態
- **AND** 提供取消操作的選項