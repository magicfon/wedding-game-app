## ADDED Requirements

### Requirement: Photo Thumbnail Generation
系統 SHALL 為所有上傳的照片提供多種尺寸的縮圖 URL。

#### Scenario: Dynamic thumbnail URL generation
- **WHEN** 用戶上傳照片
- **THEN** 系統生成小 (200px)、中 (400px)、大 (800px) 三種尺寸的 Vercel 影像處理 URL
- **AND** 縮圖 URL 模板記錄在 photos 表中
- **AND** 支援動態參數調整 (品質、格式、尺寸)

#### Scenario: Vercel Image Optimization fallback
- **WHEN** Vercel 影像處理失敗
- **THEN** 系統記錄錯誤日誌
- **AND** 使用原始照片 URL 作為回退
- **AND** 提供替代的影像處理參數

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
系統 SHALL 提供縮圖 URL 管理的 API 端點。

#### Scenario: Dynamic thumbnail URL refresh
- **WHEN** 管理員請求更新縮圖 URL
- **THEN** 系統驗證管理員權限
- **AND** 重新生成指定照片的縮圖 URL 模板
- **AND** 返回新的 URL 配置和統計資訊

#### Scenario: Thumbnail URL cleanup
- **WHEN** 原始照片被刪除
- **THEN** 系統自動清理 photos 表中的縮圖 URL 記錄
- **AND** 使相關的 Vercel 影像快取失效
- **AND** 返回清理確認

## MODIFIED Requirements

### Requirement: Photo Upload Process
照片上傳流程 SHALL 包含縮圖 URL 生成步驟。

#### Scenario: Enhanced photo upload with Vercel optimization
- **WHEN** 用戶上傳照片
- **THEN** 系統驗證照片格式和大小
- **AND** 儲存原始照片到 Supabase Storage
- **AND** 生成 Vercel 影像處理的縮圖 URL 模板
- **AND** 更新 photos 表包含縮圖 URL 資訊
- **AND** 返回包含原始和縮圖 URL 的回應

#### Scenario: Upload progress indication
- **WHEN** 照片上傳進行中
- **THEN** 系統顯示上傳進度
- **AND** 顯示 URL 生成狀態
- **AND** 提供取消操作的選項