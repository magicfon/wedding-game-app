## ADDED Requirements

### Requirement: Multiple Photo Selection
系統 SHALL 允許用戶一次選擇多張照片進行上傳。

#### Scenario: User selects multiple photos
- **WHEN** 用戶在照片上傳頁面點擊選擇照片
- **THEN** 系統顯示檔案選擇器支援多選
- **AND** 用戶可以選擇多張照片（最多為系統設定值）
- **AND** 系統顯示已選擇照片的預覽
- **AND** 系統顯示當前選擇數量和限制

#### Scenario: User exceeds photo limit
- **WHEN** 用戶選擇的照片數量超過系統限制
- **THEN** 系統顯示錯誤提示
- **AND** 系統指示最大可選擇數量
- **AND** 用戶需要減少選擇的照片數量

### Requirement: Photo Group Upload
系統 SHALL 將同一次上傳的多張照片標記為同一群組。

#### Scenario: Multiple photos uploaded together
- **WHEN** 用戶上傳多張照片
- **THEN** 系統為這次上傳生成唯一的群組 ID
- **AND** 每張照片記錄相同的 upload_group_id
- **AND** 每張照片記錄在群組中的序號 (photo_sequence)
- **AND** 系統按選擇順序分配序號

### Requirement: Blessing Message with Sequence
系統 SHALL 為每張照片的祝福語添加序號標記。

#### Scenario: Blessing message with sequence numbers
- **WHEN** 用戶輸入祝福語並上傳多張照片
- **THEN** 系統為每張照片的祝福語添加序號
- **AND** 第一張照片祝福語後面加上 "(1/3)"
- **AND** 第二張照片祝福語後面加上 "(2/3)"
- **AND** 第三張照片祝福語後面加上 "(3/3)"
- **AND** 序號格式根據實際上傳照片數量調整

#### Scenario: No blessing message provided
- **WHEN** 用戶沒有輸入祝福語
- **THEN** 系統不添加序號標記
- **AND** 照片正常上傳但祝福語為空

## MODIFIED Requirements

### Requirement: Photo Upload Process
照片上傳流程 SHALL 支援多檔案同時處理。

#### Scenario: Enhanced photo upload with multiple files
- **WHEN** 用戶上傳多張照片
- **THEN** 系統驗證每張照片的格式和大小
- **AND** 系統儲存所有照片到 Supabase Storage
- **AND** 系統為每張照片生成縮圖 URL
- **AND** 系統為每張照片記錄群組資訊和序號
- **AND** 系統為每張照片處理祝福語序號
- **AND** 系統返回所有照片的上傳結果

#### Scenario: Upload progress indication for multiple photos
- **WHEN** 多張照片上傳進行中
- **THEN** 系統顯示整體上傳進度
- **AND** 系統顯示每張照片的上傳狀態
- **AND** 系統提供取消整批上傳的選項
- **AND** 系統處理部分上傳失敗的情況

### Requirement: Photo Upload Validation
照片上傳驗證 SHALL 考慮多檔案上傳的總體限制。

#### Scenario: Multiple file validation
- **WHEN** 用戶上傳多張照片
- **THEN** 系統驗證每張照片不超過 5MB
- **AND** 系統驗證總照片數量不超過系統設定
- **AND** 系統驗證所有檔案都是有效的圖片格式
- **AND** 系統在驗證失敗時提供具體的錯誤訊息