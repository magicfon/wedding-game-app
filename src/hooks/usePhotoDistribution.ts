import { useMemo, useCallback } from 'react'
import { PhotoWithUser } from '@/lib/photo-distribution'
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

  // 獲取照片在原始數組中的索引
  const getPhotoIndex = useCallback((photoId: number) => {
    return photos.findIndex(photo => photo.id === photoId)
  }, [photos])

  // 獲取指定位置的照片
  const getPhotoAtPosition = useCallback((row: number, column: number) => {
    const index = row * columnCount + column
    return photos[index] || null
  }, [photos, columnCount])

  // 計算總行數
  const totalRows = useMemo(() => {
    return Math.ceil(photos.length / columnCount)
  }, [photos.length, columnCount])

  // 獲取最後一列的照片數量
  const lastColumnCount = useMemo(() => {
    if (photos.length === 0) return 0
    const remainder = photos.length % columnCount
    return remainder === 0 ? columnCount : remainder
  }, [photos.length, columnCount])

  return {
    columns,
    needsRedistribution,
    getColumnPhotos,
    getPhotoPosition,
    getPhotoIndex,
    getPhotoAtPosition,
    totalColumns: columns.length,
    totalPhotos: photos.length,
    totalRows,
    lastColumnCount
  }
}