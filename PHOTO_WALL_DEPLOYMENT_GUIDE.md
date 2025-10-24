# 照片牆縮圖優化 - 部署指南

## 概述
本指南提供了部署照片牆縮圖優化功能的詳細步驟，包括資料庫更新、代碼部署和驗證流程。

## 部署前準備

### 1. 備份
- 備份當前資料庫
- 備份當前代碼版本
- 準備回滾計畫

### 2. 依賴安裝
```bash
npm install sharp
npm install --save-dev @types/sharp
```

## 部署步驟

### 階段 1：資料庫更新

1. **執行資料庫更新腳本**
   ```sql
   -- 在 Supabase SQL 編輯器中執行
   -- database/add-thumbnail-support.sql
   ```

2. **驗證表結構**
   ```sql
   -- 檢查新欄位是否添加成功
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'photos' 
   AND column_name IN ('thumbnail_url', 'thumbnail_file_name', 'has_thumbnail', 'thumbnail_width', 'thumbnail_height');
   ```

### 階段 2：後端部署

1. **部署更新的 API 文件**
   - `src/lib/image-processing.ts` - 圖片處理工具
   - `src/app/api/photo/upload/route.ts` - 更新的上傳 API
   - `src/app/api/photo/list/route.ts` - 更新的列表 API
   - `src/app/api/admin/migrate-photos/route.ts` - 遷移 API

2. **驗證 API 功能**
   ```bash
   # 測試上傳 API
   curl -X POST http://localhost:3000/api/photo/upload \
     -F "file=@test-image.jpg" \
     -F "uploaderLineId=test-user" \
     -F "blessingMessage=Test message" \
     -F "isPublic=true"
   
   # 測試列表 API
   curl http://localhost:3000/api/photo/list?sortBy=time&isPublic=true
   ```

### 階段 3：前端部署

1. **部署更新的組件**
   - `src/components/PhotoModal.tsx` - 新的照片模態框
   - `src/app/photo-wall/page.tsx` - 更新的照片牆頁面
   - `src/lib/supabase.ts` - 更新的類型定義

2. **驗證前端功能**
   - 訪問照片牆頁面
   - 上傳新照片測試縮圖生成
   - 測試照片點擊放大功能

### 階段 4：遷移舊照片（可選）

1. **執行遷移腳本**
   ```sql
   -- 在 Supabase SQL 編輯器中執行
   -- database/migrate-photos-to-thumbnails.sql
   ```

2. **批量遷移照片**
   ```bash
   # 可以通過 API 批量處理
   curl -X POST http://localhost:3000/api/admin/migrate-photos
   
   # 或查看遷移狀態
   curl http://localhost:3000/api/admin/migrate-photos
   ```

## 驗證清單

### 功能驗證
- [ ] 新上傳照片自動生成縮圖
- [ ] 照片牆顯示縮圖而非原圖
- [ ] 點擊照片顯示漸進式載入效果
- [ ] 舊照片仍能正常顯示（向後相容）
- [ ] 投票功能正常工作
- [ ] 照片上傳成功率高於 95%

### 性能驗證
- [ ] 照片牆初始載入時間減少 50% 以上
- [ ] 縮圖載入速度快於原圖
- [ ] 內存使用量減少
- [ ] 網路傳輸量減少

### 兼容性驗證
- [ ] 各種設備尺寸正常顯示
- [ ] 不同圖片格式支援
- [ ] 網路慢速環境下體驗良好
- [ ] 瀏覽器相容性良好

## 監控設置

### 1. 性能監控
```javascript
// 添加到前端監控
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('thumbnail')) {
      console.log('縮圖載入時間:', entry.duration)
    }
  }
})
observer.observe({ entryTypes: ['measure'] })
```

### 2. 錯誤監控
```javascript
// 添加錯誤監控
window.addEventListener('error', (event) => {
  if (event.target.tagName === 'IMG') {
    console.error('圖片載入錯誤:', event.target.src)
    // 發送到錯誤追蹤服務
  }
})
```

### 3. API 監控
```typescript
// 在 API 中添加監控
console.log(`📸 照片上傳: ${fileName}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
console.log(`✅ 縮圖生成成功: ${thumbnailFileName}`)
console.log(`❌ 縮圖生成失敗:`, error)
```

## 故障排除

### 常見問題

1. **Sharp 庫安裝失敗**
   ```bash
   # 清除 npm 緩存
   npm cache clean --force
   # 重新安裝
   npm install sharp
   ```

2. **縮圖生成失敗**
   - 檢查圖片格式是否支援
   - 確認圖片文件沒有損壞
   - 檢查服務器磁碟空間

3. **權限問題**
   ```sql
   -- 檢查 Storage 權限
   SELECT * FROM storage.policies WHERE bucket_id = 'wedding-photos';
   ```

4. **性能問題**
   - 檢查縮圖尺寸設置
   - 確認 CDN 配置
   - 監控資料庫查詢性能

### 回滾計畫

如果需要回滾：

1. **前端回滾**
   - 恢復原始的 `src/app/photo-wall/page.tsx`
   - 移除 `src/components/PhotoModal.tsx`

2. **後端回滾**
   - 恢復原始的 API 文件
   - 移除 `src/lib/image-processing.ts`

3. **資料庫回滾**
   ```sql
   -- 可選：移除新添加的欄位
   ALTER TABLE photos DROP COLUMN IF EXISTS thumbnail_url;
   ALTER TABLE photos DROP COLUMN IF EXISTS thumbnail_file_name;
   ALTER TABLE photos DROP COLUMN IF EXISTS has_thumbnail;
   ALTER TABLE photos DROP COLUMN IF EXISTS thumbnail_width;
   ALTER TABLE photos DROP COLUMN IF EXISTS thumbnail_height;
   ```

## 維護建議

### 1. 定期維護
- 每月檢查遷移進度
- 監控存儲空間使用
- 清理失敗的遷移記錄

### 2. 性能優化
- 監控載入時間趨勢
- 考慮添加 WebP 格式支援
- 實施圖片預載入策略

### 3. 用戶體驗改進
- 收集用戶反饋
- 分析使用模式
- 持續優化載入體驗

## 聯繫支援

如果在部署過程中遇到問題：

1. 檢查日誌文件
2. 查看錯誤信息
3. 參考故障排除指南
4. 聯繫開發團隊

---

**部署完成後，請更新文檔並通知相關團隊成員。**