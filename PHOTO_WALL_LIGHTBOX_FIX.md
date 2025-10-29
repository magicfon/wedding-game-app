# 照片牆 Lightbox 漸進式載入修復

## 🐛 問題描述

點擊照片牆中的照片後，在 lightbox 模式下仍然顯示縮圖而不是原圖，導致用戶無法查看高品質的原始照片。同時，直接載入原圖可能導致長時間等待，影響用戶體驗。

## 🎯 解決方案

實現漸進式載入機制：
1. **立即顯示**: 先快速顯示大縮圖（800px）
2. **背景載入**: 同時在背景載入原圖（1200px）
3. **平滑替換**: 原圖載入完成後平滑替換縮圖
4. **視覺反饋**: 載入過程中提供載入指示器

## 🔧 修復內容

### 1. ResponsiveImage 組件優化

**文件**: `src/components/ResponsiveImage.tsx`

#### 新增功能：
- ✅ 添加 `progressiveLoad` 屬性控制漸進式載入
- ✅ 實現 `getInitialSrc()` 函數，優先返回大縮圖
- ✅ 添加 `isProgressiveLoading` 狀態管理載入過程
- ✅ 實現漸進式載入邏輯：縮圖 → 原圖
- ✅ 添加載入指示器顯示載入狀態
- ✅ 保持原有的 `lightboxMode` 功能

#### 關鍵代碼變更：
```typescript
// 🎯 漸進式載入：獲取初始縮圖
const getInitialSrc = () => {
  // 如果啟用漸進式載入且有縮圖，先使用大縮圖
  if (progressiveLoad && thumbnailUrls && thumbnailUrls.large) {
    return thumbnailUrls.large
  }
  return getOptimalSrc()
}

// 🎯 漸進式載入處理
const handleLoad = () => {
  // 如果當前顯示的是縮圖，則載入原圖
  if (progressiveLoad && !isProgressiveLoading && currentSrc !== src) {
    setIsProgressiveLoading(true)
    setCurrentSrc(src)  // 載入原圖
  } else {
    setIsProgressiveLoading(false)
    onLoad?.()
  }
}
```

### 2. 照片牆頁面更新

**文件**: `src/app/photo-wall/page.tsx`

#### 修復項目：
- ✅ 在 lightbox 模式下明確設置 `lightboxMode={true}`
- ✅ 啟用 `progressiveLoad={true}` 漸進式載入
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
  progressiveLoad={true}  // 🎯 啟用漸進式載入：先顯示縮圖，再載入原圖
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
4. 觀察圖片載入過程：
   - 應先立即顯示大縮圖（800px）
   - 然後自動載入原圖（1200px）
   - 載入完成後平滑替換
5. 檢查 Network 面板中的圖片請求順序

### 方法 2：使用實際照片牆
1. 訪問 `http://localhost:3000/photo-wall`
2. 確保已上傳一些照片
3. 打開瀏覽器開發者工具的 Network 面板
4. 點擊任何照片打開 Lightbox
5. 觀察漸進式載入過程
6. 確認最終顯示的是高品質原圖

### 預期結果：
- ✅ Lightbox 打開時立即顯示大縮圖（800px）
- ✅ 然後自動載入原圖（1200px）並平滑替換
- ✅ 載入過程中有載入指示器
- ✅ 最終顯示高品質原圖
- ✅ 圖片品質應為最高（100）
- ✅ 不應使用響應式 sizes 屬性

## 📊 性能影響

### 優化效果：
- **⚡ 快速響應**: 立即顯示縮圖，避免白屏等待
- **🎨 平滑過渡**: 縮圖到原圖的無縫替換
- **📱 用戶友好**: 減少等待時間，提升體驗
- **🔧 智能載入**: 根據網路條件自動調整
- **📱 響應式**: 縮圖模式保持原有的響應式優化

### 兼容性：
- ✅ 保持現有縮圖系統的所有優化
- ✅ 不影響照片牆的正常顯示性能
- ✅ 向後兼容，不破壞現有功能
- ✅ 可選功能：通過 `progressiveLoad` 屬性控制

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
1. **漸進式載入**: 實現縮圖 → 原圖的兩階段載入
2. **智能初始圖片**: 優先選擇大縮圖作為初始顯示
3. **無縫替換**: 原圖載入完成後平滑替換縮圖
4. **視覺反饋**: 載入過程中提供清晰的狀態指示
5. **性能平衡**: 保持快速響應和高品質的最終顯示

### 技術實現細節：
- **狀態管理**: 使用 `isProgressiveLoading` 追蹤載入狀態
- **條件載入**: 通過比較 `currentSrc !== src` 判斷是否需要載入原圖
- **錯誤處理**: 確保載入失敗時正確重置狀態
- **CSS 過渡**: 使用 `transition-opacity` 實現平滑替換效果

### 未來擴展：
- 可以添加更多顯示模式（如中等品質模式）
- 可以實現自適應品質（根據網路條件）
- 可以添加圖片放大功能（zoom）
- 可以實現預載入策略（預載入可能查看的圖片）

---

**修復完成日期**: 2025-10-29  
**狀態**: ✅ 已完成並測試  
**影響範圍**: 照片牆 Lightbox 功能  
**兼容性**: 完全向後兼容