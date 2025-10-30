import { Photo } from '@/lib/supabase'

// 定義 PhotoWithUser 類型
export interface PhotoWithUser extends Photo {
  uploader: {
    display_name: string
    avatar_url: string
  }
  user_vote_count?: number
  thumbnail_small_url?: string
  thumbnail_medium_url?: string
  thumbnail_large_url?: string
}

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

/**
 * 驗證照片分配的正確性
 * @param photos 原始照片數組
 * @param columns 分配後的列數組
 * @returns 驗證結果
 */
export const validatePhotoDistribution = (
  photos: PhotoWithUser[],
  columns: PhotoWithUser[][]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // 檢查總數是否一致
  const totalInColumns = columns.reduce((sum, column) => sum + column.length, 0)
  if (totalInColumns !== photos.length) {
    errors.push(`照片總數不一致：原始 ${photos.length}，分配後 ${totalInColumns}`)
  }
  
  // 檢查橫向排序
  const columnCount = columns.length
  for (let i = 0; i < photos.length; i++) {
    const expectedColumn = i % columnCount
    const expectedRow = Math.floor(i / columnCount)
    const actualColumn = columns.findIndex(column => 
      column.some(photo => photo.id === photos[i].id)
    )
    
    if (actualColumn !== expectedColumn) {
      errors.push(`照片 ${photos[i].id} 位置錯誤：期望列 ${expectedColumn}，實際列 ${actualColumn}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}