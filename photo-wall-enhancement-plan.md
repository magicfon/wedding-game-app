# 照片牆縮圖優化計畫

## 概述
本計畫旨在優化照片牆功能，通過實現縮圖處理來提高載入速度，同時保持現有架構和功能不變。

## 需求分析
- 照片牆顯示的照片使用縮圖處理，以增加讀取速度
- 點擊後放大的頁面才顯示原畫質圖片
- 點擊放大會先將縮圖放大，同步載入原圖，載入完畢自動平滑替換原圖
- 上傳時預生成縮圖（150px寬度）和原圖兩種尺寸
- 支援舊照片遷移

## 實現計畫

### 1. 資料庫結構更新

需要在 `photos` 表中添加縮圖相關欄位：

```sql
-- 添加縮圖支援到 photos 表
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_file_name TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS has_thumbnail BOOLEAN DEFAULT FALSE;

-- 添加索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_photos_has_thumbnail ON photos(has_thumbnail);
```

### 2. 圖片處理工具函數

創建 `src/lib/image-processing.ts` 文件，包含：
- 圖片縮圖生成函數
- 圖片尺寸調整函數
- 圖片格式轉換函數

使用 Sharp 庫進行圖片處理，支援：
- 調整圖片尺寸（保持寬高比）
- 優化圖片質量和大小
- 生成不同格式的縮圖

### 3. 更新照片上傳 API

修改 `src/app/api/photo/upload/route.ts`：
- 在上傳原始圖片後生成縮圖
- 將縮圖保存到 Supabase Storage
- 更新資料庫記錄，添加縮圖 URL 和相關信息

### 4. 更新照片列表 API

修改 `src/app/api/photo/list/route.ts`：
- 返回照片時包含縮圖 URL
- 確保向後相容性（對於沒有縮圖的舊照片）

### 5. 舊照片遷移腳本

創建 `database/migrate-photos-to-thumbnails.sql`：
- 檢查沒有縮圖的照片
- 批量生成縮圖
- 更新資料庫記錄

### 6. 更新照片牆組件

修改 `src/app/photo-wall/page.tsx`：
- 瀑布流布局使用縮圖
- 實現點擊放大時的漸進式載入效果
- 添加載入狀態指示器

### 7. 實現漸進式載入效果

創建新的 PhotoModal 組件或修改現有實現：
- 初始顯示放大的縮圖
- 背景載入原圖
- 載入完成後平滑替換
- 添加淡入淡出動畫效果

## 技術實現細節

### 縮圖尺寸
- 寬度：150px（適合手機三列布局）
- 高度：自動（保持寬高比）
- 品質：85%（平衡大小和質量）

### 存儲結構
- 原圖：`wedding-photos/{user_id}_{timestamp}.{ext}`
- 縮圖：`wedding-photos/thumbnails/{user_id}_{timestamp}_thumb.{ext}`

### 圖片處理流程
1. 用戶上傳原始圖片
2. 保存原始圖片到 Supabase Storage
3. 使用 Sharp 生成 150px 寬度的縮圖
4. 保存縮圖到 Storage 的 thumbnails 文件夾
5. 將兩個 URL 保存到資料庫

### 漸進式載入實現
1. 照片牆顯示縮圖
2. 用戶點擊照片
3. 打開模態框，顯示放大的縮圖
4. 同時開始載入原圖
5. 原圖載入完成後，使用 CSS 動畫平滑替換

## 向後相容性
- 對於沒有縮圖的舊照片，繼續使用原始圖片
- 遷移腳本可以逐步為舊照片生成縮圖
- API 返回的數據結構保持一致，只是添加可選的縮圖欄位

## 性能優化
- 縮圖使用 WebP 格式（如果支援）
- 實現圖片懶加載
- 添加適當的緩存策略
- 使用 Intersection Observer 優化載入

## 測試計畫
1. 測試新上傳照片的縮圖生成
2. 測試舊照片的遷移流程
3. 測試照片牆載入性能
4. 測試漸進式載入效果
5. 測試各種設備和螢幕尺寸的顯示效果

## 部署策略
1. 先部署資料庫更新
2. 部署後端 API 更新
3. 運行遷移腳本（可選，可後台執行）
4. 部署前端更新
5. 監控性能和錯誤

## 風險評估
- **低風險**：新功能，不影響現有功能
- **中風險**：圖片處理可能增加 API 響應時間
- **緩解措施**：使用異步處理，添加超時和錯誤處理

## 成功指標
- 照片牆初始載入時間減少 50% 以上
- 用戶體驗流暢，無明顯載入延遲
- 舊照片成功遷移率 95% 以上