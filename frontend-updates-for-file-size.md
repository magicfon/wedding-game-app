# 前端介面更新設計 - 照片檔案大小功能

## 概述

更新照片管理介面，新增檔案大小顯示功能，包括照片列表、詳情彈窗和統計資訊。

## 需要更新的檔案

### 1. 照片管理頁面 (`src/app/admin/photos/page.tsx`)

#### 更新內容

```typescript
// 新增匯入
import { HardDrive, BarChart3, TrendingUp } from 'lucide-react'

// 更新介面定義
interface PhotoWithUser {
  id: number
  image_url: string
  blessing_message: string | null
  is_public: boolean
  vote_count: number
  created_at: string
  user_id: string
  file_size: number | null // 新增檔案大小
  uploader: {
    display_name: string
    avatar_url: string | null
  }
  thumbnail_small_url?: string
  thumbnail_medium_url?: string
  thumbnail_large_url?: string
  thumbnail_generated_at?: string
}

// 新增儲存統計介面
interface StorageStatistics {
  totalPhotos: number
  photosWithSize: number
  photosWithoutSize: number
  totalStorage: {
    bytes: number
    formatted: string
  }
  averageSize: {
    bytes: number
    formatted: string
  }
  maxSize: {
    bytes: number
    formatted: string
  }
  minSize: {
    bytes: number
    formatted: string
  }
  sizeDistribution: {
    small: { count: number; percentage: number }
    medium: { count: number; percentage: number }
    large: { count: number; percentage: number }
    extraLarge: { count: number; percentage: number }
  }
}

// 新增狀態
const [storageStats, setStorageStats] = useState<StorageStatistics | null>(null)
const [statsLoading, setStatsLoading] = useState(false)

// 檔案大小格式化函數
const formatFileSize = (bytes: number | null): string => {
  if (!bytes || bytes === 0) return '未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// 獲取檔案大小顏色
const getFileSizeColor = (bytes: number | null): string => {
  if (!bytes) return 'text-gray-500'
  if (bytes < 1024 * 1024) return 'text-green-600' // 小於 1 MB - 綠色
  if (bytes < 5 * 1024 * 1024) return 'text-blue-600' // 1-5 MB - 藍色
  if (bytes < 10 * 1024 * 1024) return 'text-orange-600' // 5-10 MB - 橙色
  return 'text-red-600' // 大於 10 MB - 紅色
}

// 獲取儲存統計
const fetchStorageStats = async () => {
  setStatsLoading(true)
  try {
    const response = await fetch('/api/admin/photos/storage-stats')
    const data = await response.json()
    
    if (response.ok) {
      setStorageStats(data.data)
    } else {
      console.error('獲取儲存統計失敗:', data.error)
    }
  } catch (error) {
    console.error('獲取儲存統計錯誤:', error)
  } finally {
    setStatsLoading(false)
  }
}

// 在 useEffect 中載入統計
useEffect(() => {
  if (isAdmin) {
    fetchAllPhotos()
    fetchStorageStats() // 新增統計載入
    setLoading(false)
  }
}, [isAdmin, isLoggedIn, profile, liffIsAdmin, liffLoading, adminLoading, router])
```

#### 統計卡片更新

```typescript
// 更新統計卡片區域
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-blue-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">照片總數</h3>
        <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
      </div>
    </div>
  </div>

  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <Eye className="w-6 h-6 text-green-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">公開照片</h3>
        <p className="text-2xl font-bold text-green-600">{publicCount}</p>
      </div>
    </div>
  </div>

  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
        <EyeOff className="w-6 h-6 text-purple-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">隱私照片</h3>
        <p className="text-2xl font-bold text-purple-600">{privateCount}</p>
      </div>
    </div>
  </div>

  {/* 新增總儲存空間統計 */}
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
        <HardDrive className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">總大小</h3>
        <p className="text-2xl font-bold text-indigo-600">
          {storageStats ? storageStats.totalStorage.formatted : '載入中...'}
        </p>
      </div>
    </div>
  </div>

  {/* 新增平均檔案大小統計 */}
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
        <BarChart3 className="w-6 h-6 text-amber-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">平均大小</h3>
        <p className="text-2xl font-bold text-amber-600">
          {storageStats ? storageStats.averageSize.formatted : '載入中...'}
        </p>
      </div>
    </div>
  </div>
</div>
```

#### 照片卡片更新

```typescript
// 在照片卡片中新增檔案大小顯示
<div className="flex items-center justify-between text-xs text-gray-500">
  <div className="flex items-center space-x-1">
    <Heart className="w-3 h-3 text-red-400" />
    <span>{photo.vote_count}</span>
  </div>
  <div className="flex items-center space-x-1">
    <HardDrive className="w-3 h-3" />
    <span className={getFileSizeColor(photo.file_size)}>
      {formatFileSize(photo.file_size)}
    </span>
  </div>
  <div className="flex items-center space-x-1">
    <Clock className="w-3 h-3" />
    <span>{new Date(photo.created_at).toLocaleDateString('zh-TW')}</span>
  </div>
</div>
```

#### 照片詳情彈窗更新

```typescript
// 在照片詳情彈窗中新增檔案大小資訊
{/* 照片資訊 */}
<div className="space-y-3">
  <div className="flex items-center space-x-3">
    {selectedPhoto.uploader.avatar_url ? (
      <img
        src={selectedPhoto.uploader.avatar_url}
        alt={selectedPhoto.uploader.display_name}
        className="w-12 h-12 rounded-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextElementSibling?.classList.remove('hidden')
        }}
      />
    ) : null}
    <div className={`w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPhoto.uploader.avatar_url ? 'hidden' : ''}`}>
      <User className="w-6 h-6 text-gray-600" />
    </div>
    <div>
      <p className="font-semibold text-gray-900">{selectedPhoto.uploader.display_name}</p>
      <p className="text-sm text-gray-500">
        {new Date(selectedPhoto.created_at).toLocaleString('zh-TW')}
      </p>
    </div>
  </div>

  {/* 新增詳細照片資訊 */}
  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">📁 檔案大小</span>
      <span className={`text-sm font-medium ${getFileSizeColor(selectedPhoto.file_size)}`}>
        {formatFileSize(selectedPhoto.file_size)}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">🌐 公開狀態</span>
      <span className={`text-sm font-medium ${selectedPhoto.is_public ? 'text-green-600' : 'text-purple-600'}`}>
        {selectedPhoto.is_public ? '公開' : '隱私'}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">❤️ 投票數量</span>
      <span className="text-sm font-medium text-gray-900">{selectedPhoto.vote_count} 票</span>
    </div>
  </div>

  {/* 祝福訊息 */}
  {selectedPhoto.blessing_message && (
    <div className="bg-pink-50 rounded-lg p-4">
      <p className="text-gray-700">{selectedPhoto.blessing_message}</p>
    </div>
  )}
</div>
```

#### 新增儲存統計面板

```typescript
// 在照片管理頁面底部新增儲存統計面板
{storageStats && (
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center space-x-2 mb-6">
      <BarChart3 className="w-6 h-6 text-indigo-600" />
      <h2 className="text-xl font-semibold text-gray-800">儲存空間統計</h2>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 檔案大小分布 */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">檔案大小分布</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">小檔案 (< 1 MB)</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {storageStats.sizeDistribution.small.count} ({storageStats.sizeDistribution.small.percentage}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">中檔案 (1-5 MB)</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {storageStats.sizeDistribution.medium.count} ({storageStats.sizeDistribution.medium.percentage}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600">大檔案 (5-10 MB)</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {storageStats.sizeDistribution.large.count} ({storageStats.sizeDistribution.large.percentage}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">超大檔案 (> 10 MB)</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {storageStats.sizeDistribution.extraLarge.count} ({storageStats.sizeDistribution.extraLarge.percentage}%)
            </span>
          </div>
        </div>
      </div>
      
      {/* 詳細統計 */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">詳細統計</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">總照片數量</span>
            <span className="text-sm font-medium text-gray-900">{storageStats.totalPhotos} 張</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">有大小資料</span>
            <span className="text-sm font-medium text-gray-900">{storageStats.photosWithSize} 張</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">缺少大小資料</span>
            <span className="text-sm font-medium text-orange-600">{storageStats.photosWithoutSize} 張</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">總儲存空間</span>
            <span className="text-sm font-medium text-gray-900">{storageStats.totalStorage.formatted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">平均檔案大小</span>
            <span className="text-sm font-medium text-gray-900">{storageStats.averageSize.formatted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">最大檔案</span>
            <span className="text-sm font-medium text-gray-900">{storageStats.maxSize.formatted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">最小檔案</span>
            <span className="text-sm font-medium text-gray-900">{storageStats.minSize.formatted}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

## 新增功能

### 1. 檔案大小排序功能

```typescript
// 新增排序選項
const [sortBy, setSortBy] = useState<'created_at' | 'file_size'>('created_at')
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

// 排序函數
const sortPhotos = (photos: PhotoWithUser[]) => {
  return [...photos].sort((a, b) => {
    let aValue: number | string = a[sortBy]
    let bValue: number | string = b[sortBy]
    
    if (sortBy === 'file_size') {
      aValue = a.file_size || 0
      bValue = b.file_size || 0
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
}

// 在篩選按鈕區域新增排序選項
<div className="bg-white rounded-xl shadow-md p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <Filter className="w-5 h-5 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">篩選：</span>
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部 ({photos.length})
        </button>
        <button
          onClick={() => setFilter('public')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'public'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          公開 ({publicCount})
        </button>
        <button
          onClick={() => setFilter('private')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'private'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          隱私 ({privateCount})
        </button>
      </div>
    </div>
    
    {/* 新增排序選項 */}
    <div className="flex items-center space-x-2">
      <TrendingUp className="w-5 h-5 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">排序：</span>
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [field, order] = e.target.value.split('-')
          setSortBy(field as 'created_at' | 'file_size')
          setSortOrder(order as 'asc' | 'desc')
        }}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="created_at-desc">最新上傳</option>
        <option value="created_at-asc">最早上傳</option>
        <option value="file_size-desc">檔案大小 (大到小)</option>
        <option value="file_size-asc">檔案大小 (小到大)</option>
      </select>
    </div>
  </div>
</div>
```

## 響應式設計考量

### 1. 桌面版 (≥ 1024px)
- 統計卡片: 5 列顯示
- 照片網格: 5 列顯示
- 完整的儲存統計面板

### 2. 平板版 (768px - 1023px)
- 統計卡片: 3 列顯示
- 照片網格: 3-4 列顯示
- 儲存統計面板: 垂直堆疊

### 3. 手機版 (< 768px)
- 統計卡片: 2 列顯示
- 照片網格: 2 列顯示
- 儲存統計面板: 簡化顯示

## 效能優化

### 1. 虛擬滾動
對於大量照片，考慮使用虛擬滾動來提升效能。

### 2. 圖片懶加載
實現圖片懶加載，只在需要時載入圖片。

### 3. 快取策略
適當快取統計資料，減少 API 請求。

## 測試計劃

### 1. 單元測試
- 檔案大小格式化函數
- 檔案大小分類函數
- 排序功能

### 2. 整合測試
- API 請求和回應
- 介面渲染
- 互動功能

### 3. 使用者體驗測試
- 響應式設計
- 載入效能
- 錯誤處理

這個設計提供了完整的檔案大小顯示功能，同時保持了良好的使用者體驗和效能。