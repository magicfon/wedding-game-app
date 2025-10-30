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

  // 手動更新列數的方法
  const updateColumnCount = useCallback((width: number) => {
    const newColumnCount = getColumnCount(width)
    if (newColumnCount !== columnCount) {
      setColumnCount(newColumnCount)
      setContainerWidth(width)
    }
  }, [columnCount])

  return {
    columnCount,
    containerWidth,
    handleResize,
    updateColumnCount
  }
}