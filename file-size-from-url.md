# 直接從 URL 讀取檔案大小 - 實施方案

## 🎯 需求
不新增資料庫欄位，直接從照片 URL 讀取檔案大小並顯示在照片管理介面中。

## 🔧 技術方案

### 1. 前端直接讀取檔案大小
使用 JavaScript 的 `fetch` API 發送 HEAD 請求來獲取檔案大小，無需修改資料庫。

### 2. 實現方式
- 在照片載入時異步獲取檔案大小
- 使用快取避免重複請求
- 優雅處理錯誤情況

## 📋 具體實施

### 1. 修改照片管理頁面

#### 1.1 新增檔案大小狀態管理
```typescript
// 在 src/app/admin/photos/page.tsx 中新增
const [fileSizes, setFileSizes] = useState<Map<number, number>>(new Map())
const [loadingSizes, setLoadingSizes] = useState<Set<number>>(new Set())
```

#### 1.2 新增獲取檔案大小函數
```typescript
// 獲取檔案大小
const fetchFileSize = async (photoId: number, imageUrl: string): Promise<number | null> => {
  // 檢查快取
  if (fileSizes.has(photoId)) {
    return fileSizes.get(photoId)!
  }
  
  // 檢查是否正在載入
  if (loadingSizes.has(photoId)) {
    return null
  }
  
  setLoadingSizes(prev => new Set(prev).add(photoId))
  
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' })
    const contentLength = response.headers.get('content-length')
    
    if (contentLength) {
      const fileSize = parseInt(contentLength, 10)
      setFileSizes(prev => new Map(prev).set(photoId, fileSize))
      return fileSize
    }
  } catch (error) {
    console.warn(`無法獲取照片 ${photoId} 的檔案大小:`, error)
  } finally {
    setLoadingSizes(prev => {
      const newSet = new Set(prev)
      newSet.delete(photoId)
      return newSet
    })
  }
  
  return null
}
```

#### 1.3 批量獲取檔案大小
```typescript
// 批量獲取可見照片的檔案大小
useEffect(() => {
  if (filteredPhotos.length > 0) {
    const visiblePhotoIds = filteredPhotos.slice(0, 20) // 限制前 20 張照片
    
    visiblePhotoIds.forEach(photo => {
      if (!fileSizes.has(photo.id) && !loadingSizes.has(photo.id)) {
        fetchFileSize(photo.id, photo.image_url)
      }
    })
  }
}, [filteredPhotos])
```

#### 1.4 修改照片卡片顯示
```typescript
// 修改照片卡片底部顯示
<div className="flex items-center justify-between text-xs text-gray-500">
  <div className="flex items-center space-x-1">
    <Heart className="w-3 h-3 text-red-400" />
    <span>{photo.vote_count}</span>
  </div>
  <div className="flex items-center space-x-1">
    {loadingSizes.has(photo.id) ? (
      <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
    ) : (
      <>
        <HardDrive className="w-3 h-3" />
        <span>{formatFileSize(fileSizes.get(photo.id) || null)}</span>
      </>
    )}
  </div>
</div>
```

### 2. 優化方案

#### 2.1 虛擬滾動支援
如果使用虛擬滾動，只在照片可見時獲取檔案大小：

```typescript
// 使用 Intersection Observer
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const photoId = parseInt(entry.target.getAttribute('data-photo-id')!)
          const imageUrl = entry.target.getAttribute('data-image-url')!
          fetchFileSize(photoId, imageUrl)
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )
  
  // 觀察所有照片元素
  document.querySelectorAll('[data-photo-id]').forEach(el => {
    observer.observe(el)
  })
  
  return () => observer.disconnect()
}, [filteredPhotos])
```

#### 2.2 本地快取
使用 localStorage 快取檔案大小：

```typescript
// 從 localStorage 讀取快取
const loadCachedFileSizes = (): Map<number, number> => {
  try {
    const cached = localStorage.getItem('photo-file-sizes')
    if (cached) {
      const data = JSON.parse(cached)
      return new Map(Object.entries(data).map(([k, v]) => [parseInt(k), v as number]))
    }
  } catch (error) {
    console.warn('讀取檔案大小快取失敗:', error)
  }
  return new Map()
}

// 儲存到 localStorage
const saveCachedFileSizes = (sizes: Map<number, number>) => {
  try {
    const data = Object.fromEntries(sizes)
    localStorage.setItem('photo-file-sizes', JSON.stringify(data))
  } catch (error) {
    console.warn('儲存檔案大小快取失敗:', error)
  }
}

// 在組件初始化時載入快取
useEffect(() => {
  setFileSizes(loadCachedFileSizes())
}, [])

// 當檔案大小更新時儲存快取
useEffect(() => {
  if (fileSizes.size > 0) {
    saveCachedFileSizes(fileSizes)
  }
}, [fileSizes])
```

## 🚀 實施步驟

### 1. 修改照片管理頁面
- 新增檔案大小狀態管理
- 新增 `fetchFileSize` 函數
- 修改照片卡片顯示邏輯

### 2. 測試功能
- 測試檔案大小正確顯示
- 測試載入狀態顯示
- 測試錯誤處理

### 3. 優化效能
- 實現虛擬滾動支援
- 新增本地快取機制

## 📊 優缺點分析

### 優點
- ✅ 無需修改資料庫結構
- ✅ 實現簡單，風險低
- ✅ 可以逐步實施
- ✅ 自動獲取最新檔案大小

### 缺點
- ❌ 需要額外的 HTTP 請求
- ❌ 初始載入時可能有延遲
- ❌ 依賴外部服務的 HEAD 請求支援
- ❌ 如果檔案 URL 失效無法獲取大小

## 🔧 故障排除

### 問題 1: CORS 錯誤
**解決**: 確保圖片服務器支援跨域 HEAD 請求

### 問題 2: 檔案大小獲取失敗
**解決**: 優雅處理錯誤，顯示 "未知"

### 問題 3: 效能問題
**解決**: 使用快取和虛擬滾動優化

## 📝 代碼範例

完整的實現代碼請參考下一個檔案：`file-size-implementation.tsx`

這個方案避免了資料庫修改，直接從 URL 讀取檔案大小，是一個更輕量級的解決方案。