# 照片牆 Lightbox 原圖顯示修復

## 🐛 問題描述

點擊照片牆中的照片後，在 lightbox 模式下仍然顯示縮圖而不是原圖，導致用戶無法查看高品質的原始照片。

## 🔧 修復內容

### 1. ResponsiveImage 組件優化

**文件**: `src/components/ResponsiveImage.tsx`

#### 修復項目：
- ✅ 添加 `lightboxMode` 屬性檢查，確保在放大模式下強制使用原圖
- ✅ 在 `getOptimalSrc()` 函數中優先返回原圖 URL
- ✅ 在 lightbox 模式下禁用響應式 `sizes` 屬性
- ✅ 在 lightbox 模式下使用最高品質設定 (quality=100)
- ✅ 在 lightbox 模式下設置 `priority=true` 優先載入
- ✅ 添加 `typeof window !== 'undefined'` 檢查避免 SSR 錯誤

#### 關鍵代碼變更：
```typescript
// 🎯 放大模式優先使用原圖
if (lightboxMode) {
  return src
}

// 🎯 放大模式下使用最高品質
quality={lightboxMode ? 100 : quality}

// 🎯 放大模式下不使用響應式尺寸
sizes={lightboxMode ? undefined : sizes}
```

### 2. 照片牆頁面更新

**文件**: `src/app/photo-wall/page.tsx`

#### 修復項目：
- ✅ 在 lightbox 模式下明確設置 `lightboxMode={true}`
- ✅ 設置 `sizes={undefined}` 禁用響應式尺寸
- ✅ 設置 `quality={100}` 使用最高品質
- ✅ 保持 `priority={true}` 確保快速載入

#### 關鍵代碼變更：
```typescript
<ResponsiveImage
  src={selectedPhoto.image_url}
  alt="Wedding photo"
  className="max-w-full max-h-[70vh] w-auto h-auto"
  lightboxMode={true}  // 🎯 放大模式強制使用原圖
  thumbnailUrls={{
    small: selectedPhoto.thumbnail_small_url,
    medium: selectedPhoto.thumbnail_medium_url,
    large: selectedPhoto.thumbnail_large_url
  }}
  sizes={undefined}  // 🎯 放大模式下不使用響應式尺寸
  priority={true}
  quality={100}  // 🎯 放大模式下使用最高品質
/>
```

## 🧪 測試方法

### 方法 1：使用測試頁面
1. 訪問 `http://localhost:3000/debug/lightbox-test`
2. 打開瀏覽器開發者工具的 Network 面板
3. 點擊縮圖打開 Lightbox
4. 檢查 Network 面板中的圖片請求
5. 確認請求的是原圖 URL（1200px）而不是縮圖 URL

### 方法 2：使用實際照片牆
1. 訪問 `http://localhost:3000/photo-wall`
2. 確保已上傳一些照片
3. 打開瀏覽器開發者工具的 Network 面板
4. 點擊任何照片打開 Lightbox
5. 檢查 Network 面板中的圖片請求
6. 確認請求的是原圖而不是縮圖

### 預期結果：
- ✅ Lightbox 中應載入原圖（完整尺寸）
- ✅ 圖片品質應為最高（100）
- ✅ 不應使用響應式 sizes 屬性
- ✅ 圖片應快速載入（priority=true）

## 📊 性能影響

### 優化效果：
- **用戶體驗**: 用戶現在可以查看高品質的原始照片
- **載入策略**: Lightbox 模式下優先載入原圖，確保最佳視覺效果
- **頻寬使用**: 只在用戶明確要求查看大圖時才載入原圖
- **響應式**: 縮圖模式保持原有的響應式優化

### 兼容性：
- ✅ 保持現有縮圖系統的所有優化
- ✅ 不影響照片牆的正常顯示性能
- ✅ 向後兼容，不破壞現有功能

## 🔍 驗證步驟

### 開發者驗證：
1. 檢查 `src/components/ResponsiveImage.tsx` 中的 `getOptimalSrc()` 函數
2. 確認 `lightboxMode` 檢查在函數開始處
3. 檢查 `src/app/photo-wall/page.tsx` 中的 ResponsiveImage 調用
4. 確認 `lightboxMode={true}` 和相關屬性設置

### 用戶體驗驗證：
1. 在照片牆中點擊照片
2. 觀察 lightbox 中的圖片清晰度
3. 比較縮圖和原圖的品質差異
4. 測試在不同設備上的表現

## 📝 技術筆記

### 關鍵改進點：
1. **明確的 lightbox 模式**: 通過 `lightboxMode` 屬性明確區分顯示模式
2. **原圖優先**: 在 lightbox 模式下直接返回原圖 URL
3. **品質優化**: 使用最高品質設定確保最佳視覺效果
4. **性能平衡**: 保持縮圖模式的性能優化，同時提供高品質查看選項

### 未來擴展：
- 可以添加更多顯示模式（如中等品質模式）
- 可以實現自適應品質（根據網路條件）
- 可以添加圖片放大功能（zoom）

---

**修復完成日期**: 2025-10-29  
**狀態**: ✅ 已完成並測試  
**影響範圍**: 照片牆 Lightbox 功能  
**兼容性**: 完全向後兼容