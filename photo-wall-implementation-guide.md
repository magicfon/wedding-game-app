# 照片牆橫向排序實現指南

## 實現步驟

### 第一步：創建照片分配工具函數

創建 `src/lib/photo-distribution.ts` 文件：

```typescript
import { PhotoWithUser } from '@/lib/supabase'

/**
 * 根據螢幕寬度獲取列數
 */
export const getColumnCount = (width: number): number => {
  if (width < 640) return 3;   // sm: 3 columns
  if (width < 1024) return 4;  // md: 4 columns  
  if (width < 1280) return 4;  // lg: 4 columns
  return 5;                     // xl: 5 columns
}

/**
 * 將照片按橫向順序分配到各列
 * @param photos 照片數組
 * @param columnCount 列數
 * @returns 二維數組，每個子數組代表一列的照片
 */
export const distributePhotosToColumns = (
  photos: PhotoWithUser[], 
  columnCount: number
): PhotoWithUser[][] => {
  // 初始化列數組
  const columns: PhotoWithUser[][] = Array.from({ length: columnCount }, () => [])
  
  // 按橫向順序分配照片
  photos.forEach((photo, index) => {
    const columnIndex = index % columnCount
    columns[columnIndex].push(photo)
  })
  
  return columns
}

/**
 * 獲取當前螢幕尺寸的列數
 */
export const getCurrentColumnCount = (): number => {
  if (typeof window === 'undefined') return 4 // 默認值
  return getColumnCount(window.innerWidth)
}

/**
 * 計算照片在網格中的位置
 * @param index 照片在原始數組中的索引
 * @param columnCount 列數
 * @returns 包含行和列信息的對象
 */
export const getPhotoPosition = (
  index: number, 
  columnCount: number
): { row: number; column: number } => {
  return {
    row: Math.floor(index / columnCount),
    column: index % columnCount
  }
}

/**
 * 檢查是否需要重新分配照片
 * @param oldColumnCount 舊列數
 * @param newColumnCount 新列數
 * @returns 是否需要重新分配
 */
export const shouldRedistribute = (
  oldColumnCount: number, 
  newColumnCount: number
): boolean => {
  return oldColumnCount !== newColumnCount
}
```

### 第二步：創建響應式 Hook

創建 `src/hooks/useResponsiveColumns.ts` 文件：

```typescript
import { useState, useEffect, useCallback } from 'react'
import { getColumnCount, getCurrentColumnCount } from '@/lib/photo-distribution'

export const useResponsiveColumns = () => {
  const [columnCount, setColumnCount] = useState(getCurrentColumnCount())
  const [containerWidth, setContainerWidth] = useState(0)

  // 處理螢幕尺寸變化
  const handleResize = useCallback(() => {
    const newColumnCount = getCurrentColumnCount()
    setColumnCount(newColumnCount)
    
    // 更新容器寬度
    if (typeof window !== 'undefined') {
      setContainerWidth(window.innerWidth)
    }
  }, [])

  // 監聽螢幕尺寸變化
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 初始化
    handleResize()

    // 添加事件監聽器
    window.addEventListener('resize', handleResize)
    
    // 清理函數
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  return {
    columnCount,
    containerWidth,
    handleResize
  }
}
```

### 第三步：創建照片分配 Hook

創建 `src/hooks/usePhotoDistribution.ts` 文件：

```typescript
import { useMemo, useCallback } from 'react'
import { PhotoWithUser } from '@/lib/supabase'
import { distributePhotosToColumns, shouldRedistribute } from '@/lib/photo-distribution'

export const usePhotoDistribution = (
  photos: PhotoWithUser[],
  columnCount: number
) => {
  // 分配照片到各列
  const columns = useMemo(() => {
    if (!photos.length || columnCount <= 0) {
      return []
    }
    return distributePhotosToColumns(photos, columnCount)
  }, [photos, columnCount])

  // 檢查是否需要重新分配
  const needsRedistribution = useCallback((newColumnCount: number) => {
    return shouldRedistribute(columnCount, newColumnCount)
  }, [columnCount])

  // 獲取指定列的照片
  const getColumnPhotos = useCallback((columnIndex: number) => {
    return columns[columnIndex] || []
  }, [columns])

  // 獲取照片位置信息
  const getPhotoPosition = useCallback((photoId: number) => {
    const index = photos.findIndex(photo => photo.id === photoId)
    if (index === -1) return null
    
    return {
      index,
      row: Math.floor(index / columnCount),
      column: index % columnCount
    }
  }, [photos, columnCount])

  return {
    columns,
    needsRedistribution,
    getColumnPhotos,
    getPhotoPosition,
    totalColumns: columns.length,
    totalPhotos: photos.length
  }
}
```

### 第四步：修改照片牆組件

修改 `src/app/photo-wall/page.tsx` 文件中的關鍵部分：

```typescript
// 在文件頂部添加新的導入
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns'
import { usePhotoDistribution } from '@/hooks/usePhotoDistribution'

// 在組件內部修改狀態和邏輯
export default function PhotoWallPage() {
  // ... 現有的狀態保持不變 ...
  
  // 添加響應式列數管理
  const { columnCount, containerWidth } = useResponsiveColumns()
  
  // 使用照片分配 Hook
  const { columns } = usePhotoDistribution(displayedPhotos, columnCount)

  // 修改載入更多照片的邏輯
  const loadMorePhotos = useCallback(() => {
    if (loadingMore || displayedPhotos.length >= photos.length) return

    setLoadingMore(true)
    setTimeout(() => {
      const nextPage = page + 1
      const newPhotos = photos.slice(0, nextPage * PHOTOS_PER_PAGE)
      setDisplayedPhotos(newPhotos)
      setPage(nextPage)
      setLoadingMore(false)
    }, 500)
  }, [loadingMore, displayedPhotos.length, photos, page])

  // ... 其他現有邏輯保持不變 ...

  // 修改渲染部分
  return (
    <Layout title="照片牆">
      {/* ... 現有的頂部控制部分保持不變 ... */}
      
      {/* 新的網格佈局照片牆 */}
      {displayedPhotos.length === 0 ? (
        // ... 現有的空狀態顯示 ...
      ) : (
        <>
          {/* 使用 CSS Grid 替代 CSS Columns */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {columns.map((column, columnIndex) => (
              <div 
                key={`column-${columnIndex}`} 
                className="flex flex-col space-y-3 sm:space-y-4"
              >
                {column.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="break-inside-avoid cursor-pointer group"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                      {/* 照片內容保持不變 */}
                      <div className="relative">
                        <ResponsiveImage
                          src={photo.image_url}
                          alt="Wedding photo"
                          className="w-full h-auto"
                          thumbnailUrls={{
                            small: photo.thumbnail_small_url,
                            medium: photo.thumbnail_medium_url,
                            large: photo.thumbnail_large_url
                          }}
                          sizes="(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px"
                        />
                        
                        {/* 票數顯示 */}
                        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/70 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center space-x-1">
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                          <span className="text-xs sm:text-sm font-semibold">{photo.vote_count}</span>
                        </div>
                      </div>

                      {/* 簡化資訊 */}
                      <div className="p-2 sm:p-3">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <img
                            src={photo.uploader.avatar_url || '/default-avatar.png'}
                            alt="Avatar"
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                            {photo.uploader.display_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 載入更多指示器 */}
          {displayedPhotos.length < photos.length && (
            <div ref={loadMoreRef} className="text-center py-8">
              {loadingMore && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
              )}
            </div>
          )}

          {/* 已載入全部照片 */}
          {displayedPhotos.length >= photos.length && photos.length > PHOTOS_PER_PAGE && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">✨ 已載入全部 {photos.length} 張照片</p>
            </div>
          )}
        </>
      )}
      
      {/* ... 現有的模態框和其他部分保持不變 ... */}
    </Layout>
  )
}
```

### 第五步：添加過渡動畫

創建 `src/components/PhotoTransition.tsx` 文件：

```typescript
import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PhotoTransitionProps {
  children: ReactNode
  isVisible: boolean
  index: number
}

export const PhotoTransition: React.FC<PhotoTransitionProps> = ({
  children,
  isVisible,
  index
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.3,
            delay: index * 0.05, // 錯開動畫時間
            ease: "easeOut"
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### 第六步：性能優化

創建 `src/hooks/useVirtualization.ts` 文件：

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react'

interface VirtualizationOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export const useVirtualization = (
  items: any[],
  options: VirtualizationOptions
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  // 計算可見範圍
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // 可見項目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  // 處理滾動事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // 總高度
  const totalHeight = items.length * itemHeight

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    handleScroll,
    scrollTop
  }
}
```

### 第七步：測試組件

創建 `src/__tests__/photo-distribution.test.ts` 文件：

```typescript
import { describe, it, expect } from 'vitest'
import { 
  getColumnCount, 
  distributePhotosToColumns, 
  getPhotoPosition 
} from '@/lib/photo-distribution'

// 模擬照片數據
const mockPhotos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  image_url: `https://example.com/photo${i + 1}.jpg`,
  blessing_message: `Message ${i + 1}`,
  is_public: true,
  vote_count: i,
  created_at: new Date().toISOString(),
  user_id: `user${i + 1}`,
  uploader: {
    display_name: `User ${i + 1}`,
    avatar_url: `https://example.com/avatar${i + 1}.jpg`
  }
}))

describe('Photo Distribution Utils', () => {
  describe('getColumnCount', () => {
    it('should return 3 columns for small screens', () => {
      expect(getColumnCount(500)).toBe(3)
    })

    it('should return 4 columns for medium screens', () => {
      expect(getColumnCount(800)).toBe(4)
    })

    it('should return 5 columns for large screens', () => {
      expect(getColumnCount(1400)).toBe(5)
    })
  })

  describe('distributePhotosToColumns', () => {
    it('should distribute photos horizontally across columns', () => {
      const columns = distributePhotosToColumns(mockPhotos, 3)
      
      // 檢查第一列：應該包含照片 1, 4, 7, 10
      expect(columns[0]).toEqual([
        mockPhotos[0], // photo 1
        mockPhotos[3], // photo 4
        mockPhotos[6], // photo 7
        mockPhotos[9]  // photo 10
      ])
      
      // 檢查第二列：應該包含照片 2, 5, 8, 11
      expect(columns[1]).toEqual([
        mockPhotos[1], // photo 2
        mockPhotos[4], // photo 5
        mockPhotos[7], // photo 8
        mockPhotos[10] // photo 11
      ])
      
      // 檢查第三列：應該包含照片 3, 6, 9, 12
      expect(columns[2]).toEqual([
        mockPhotos[2], // photo 3
        mockPhotos[5], // photo 6
        mockPhotos[8], // photo 9
        mockPhotos[11] // photo 12
      ])
    })

    it('should handle empty photo array', () => {
      const columns = distributePhotosToColumns([], 3)
      expect(columns).toEqual([[], [], []])
    })

    it('should handle single photo', () => {
      const columns = distributePhotosToColumns([mockPhotos[0]], 3)
      expect(columns).toEqual([[mockPhotos[0]], [], []])
    })
  })

  describe('getPhotoPosition', () => {
    it('should return correct position for photo at index 0', () => {
      const position = getPhotoPosition(0, 3)
      expect(position).toEqual({ row: 0, column: 0 })
    })

    it('should return correct position for photo at index 5', () => {
      const position = getPhotoPosition(5, 3)
      expect(position).toEqual({ row: 1, column: 2 })
    })

    it('should return correct position for photo at index 10', () => {
      const position = getPhotoPosition(10, 3)
      expect(position).toEqual({ row: 3, column: 1 })
    })
  })
})
```

## 部署步驟

### 1. 準備工作
- 確保所有依賴已安裝
- 備份現有代碼
- 創建功能分支

### 2. 實施步驟
1. 創建工具函數文件
2. 創建自定義 Hooks
3. 修改照片牆組件
4. 添加測試文件
5. 運行測試確保功能正常

### 3. 測試驗證
1. 單元測試：驗證照片分配邏輯
2. 集成測試：測試完整流程
3. 用戶體驗測試：驗證交互流暢度
4. 性能測試：確保載入速度

### 4. 部署上線
1. 代碼審查
2. 預發布環境測試
3. 生產環境部署
4. 監控和回滾準備

## 注意事項

### 性能考量
1. **避免過度重新渲染**：使用 useMemo 和 useCallback 優化
2. **圖片懶加載**：只載入可見區域的照片
3. **虛擬滾動**：大量照片時考慮使用虛擬滾動

### 兼容性考量
1. **響應式設計**：確保在不同設備上正常顯示
2. **瀏覽器兼容性**：測試主流瀏覽器
3. **網路環境**：考慮慢速網路下的用戶體驗

### 維護性考量
1. **代碼結構**：保持清晰的模塊化結構
2. **文檔更新**：及時更新相關文檔
3. **測試覆蓋**：確保足夠的測試覆蓋率

這個實現指南提供了完整的解決方案，確保照片牆在無限滾動時保持橫向排序，同時保持良好的用戶體驗和性能。