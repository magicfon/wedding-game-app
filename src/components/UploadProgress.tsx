'use client'

import { useState, useEffect } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface UploadProgressProps {
  isUploading: boolean
  progress?: number
  fileName?: string
  error?: string | null
  onComplete?: () => void
  onCancel?: () => void
  showPercentage?: boolean
  showFileName?: boolean
  size?: 'small' | 'medium' | 'large'
}

export default function UploadProgress({
  isUploading,
  progress = 0,
  fileName,
  error = null,
  onComplete,
  onCancel,
  showPercentage = true,
  showFileName = true,
  size = 'medium'
}: UploadProgressProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // 控制組件顯示/隱藏
  useEffect(() => {
    if (isUploading) {
      setIsVisible(true)
      setIsCompleted(false)
    } else if (progress >= 100 && !error) {
      setIsCompleted(true)
      // 2秒後自動隱藏
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 2000)
      return () => clearTimeout(timer)
    } else if (!isUploading && !error) {
      // 如果沒有上傳且沒有錯誤，延遲隱藏
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isUploading, progress, error, onComplete])

  if (!isVisible) return null

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'p-3 text-sm'
      case 'large':
        return 'p-6 text-lg'
      default:
        return 'p-4 text-base'
    }
  }

  const getProgressBarHeight = () => {
    switch (size) {
      case 'small':
        return 'h-1'
      case 'large':
        return 'h-3'
      default:
        return 'h-2'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4'
      case 'large':
        return 'w-8 h-8'
      default:
        return 'w-6 h-6'
    }
  }

  return (
    <div className={`fixed inset-x-4 top-4 z-50 max-w-md mx-auto animate-slideDown`}>
      <div className={`bg-white rounded-lg shadow-lg border ${getSizeClasses()}`}>
        {/* 頭部 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {error ? (
              <AlertCircle className={`${getIconSize()} text-red-500`} />
            ) : isCompleted ? (
              <CheckCircle className={`${getIconSize()} text-green-500`} />
            ) : (
              <Loader2 className={`${getIconSize()} text-blue-500 animate-spin`} />
            )}
            
            <span className="font-medium text-gray-900">
              {error ? '上傳失敗' : isCompleted ? '上傳完成' : '上傳中...'}
            </span>
          </div>
          
          {onCancel && isUploading && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 檔案名稱 */}
        {showFileName && fileName && (
          <div className="text-sm text-gray-600 mb-2 truncate">
            {fileName}
          </div>
        )}

        {/* 進度條 */}
        {!error && (
          <div className="w-full bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className={`bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out ${getProgressBarHeight()}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {/* 進度資訊 */}
        <div className="flex items-center justify-between text-sm">
          {showPercentage && !error && (
            <span className="text-gray-600">
              {Math.round(progress)}%
            </span>
          )}
          
          {error && (
            <span className="text-red-600 text-xs">
              {error}
            </span>
          )}
          
          {isCompleted && (
            <span className="text-green-600 text-xs">
              檔案已成功上傳
            </span>
          )}
        </div>

        {/* 詳細狀態訊息 */}
        {isUploading && !error && (
          <div className="text-xs text-gray-500 mt-2">
            {progress < 30 && '正在準備上傳...'}
            {progress >= 30 && progress < 70 && '正在上傳檔案...'}
            {progress >= 70 && progress < 90 && '正在處理檔案...'}
            {progress >= 90 && progress < 100 && '即將完成...'}
          </div>
        )}
      </div>
    </div>
  )
}

// 模擬上傳進度的 Hook
export function useUploadProgress() {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startUpload = () => {
    setProgress(0)
    setIsUploading(true)
    setError(null)
  }

  const updateProgress = (newProgress: number) => {
    setProgress(Math.min(newProgress, 100))
  }

  const completeUpload = () => {
    setProgress(100)
    setIsUploading(false)
  }

  const failUpload = (errorMessage: string) => {
    setError(errorMessage)
    setIsUploading(false)
  }

  const reset = () => {
    setProgress(0)
    setIsUploading(false)
    setError(null)
  }

  // 模擬上傳進度的輔助函數
  const simulateProgress = async (duration: number = 3000) => {
    startUpload()
    
    const steps = [10, 25, 40, 60, 75, 85, 95, 100]
    const stepDuration = duration / steps.length
    
    for (const stepProgress of steps) {
      await new Promise(resolve => setTimeout(resolve, stepDuration))
      updateProgress(stepProgress)
    }
    
    completeUpload()
  }

  return {
    progress,
    isUploading,
    error,
    startUpload,
    updateProgress,
    completeUpload,
    failUpload,
    reset,
    simulateProgress
  }
}