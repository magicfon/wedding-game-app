'use client'

import { useState, useRef } from 'react'
import UploadProgress, { useUploadProgress } from './UploadProgress'
import { uploadWithProgress, createUploadController, formatFileSize } from '@/lib/upload-with-progress'
import { Upload, X, Image as ImageIcon, Video, FileText } from 'lucide-react'

interface MediaUploadProps {
  mediaType: 'text' | 'image' | 'video'
  currentMediaUrl?: string
  currentThumbnailUrl?: string
  currentAltText?: string
  onMediaChange: (data: {
    mediaUrl: string | null
    thumbnailUrl: string | null
    altText: string
  }) => void
  disabled?: boolean
}

export default function MediaUpload({
  mediaType,
  currentMediaUrl,
  currentThumbnailUrl,
  currentAltText,
  onMediaChange,
  disabled = false
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [altText, setAltText] = useState(currentAltText || '')
  const [uploadController, setUploadController] = useState<ReturnType<typeof createUploadController> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 使用上傳進度 Hook
  const { progress, isUploading, error, startUpload, updateProgress, completeUpload, failUpload, reset } = useUploadProgress()

  const handleFileSelect = async (file: File) => {
    if (!file || disabled) return

    // 創建上傳控制器
    const controller = createUploadController()
    setUploadController(controller)

    try {
      startUpload()

      // 使用帶進度的上傳函數
      const result = await uploadWithProgress({
        url: '/api/admin/media/upload',
        file,
        data: {
          mediaType,
          altText
        },
        onProgress: (progress, status) => {
          updateProgress(progress)
        },
        signal: controller.signal
      })

      if (result.success) {
        onMediaChange({
          mediaUrl: result.data.publicUrl,
          thumbnailUrl: result.data.thumbnailUrl,
          altText: result.data.altText || altText
        })
        console.log('✅ 媒體上傳成功:', result.data)
        completeUpload()
      } else {
        failUpload(result.error || '上傳失敗')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上傳失敗，請稍後再試'
      failUpload(errorMessage)
      console.error('❌ 上傳錯誤:', error)
    } finally {
      setUploadController(null)
    }
  }

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.cancel()
      setUploadController(null)
      reset()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleRemoveMedia = () => {
    onMediaChange({
      mediaUrl: null,
      thumbnailUrl: null,
      altText: ''
    })
    setAltText('')
  }

  const handleAltTextChange = (newAltText: string) => {
    setAltText(newAltText)
    if (currentMediaUrl) {
      onMediaChange({
        mediaUrl: currentMediaUrl,
        thumbnailUrl: currentThumbnailUrl || null,
        altText: newAltText
      })
    }
  }

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-blue-500" />
      case 'video':
        return <Video className="w-8 h-8 text-purple-500" />
      default:
        return <FileText className="w-8 h-8 text-gray-500" />
    }
  }

  const getAcceptTypes = () => {
    switch (mediaType) {
      case 'image':
        return 'image/jpeg,image/jpg,image/png,image/gif,image/webp'
      case 'video':
        return 'video/mp4,video/webm,video/ogg'
      default:
        return ''
    }
  }

  const getMaxSizeText = () => {
    switch (mediaType) {
      case 'image':
        return '最大 5MB'
      case 'video':
        return '最大 50MB'
      default:
        return ''
    }
  }

  if (mediaType === 'text') {
    return (
      <div className="text-center py-4 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>純文字題目</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 媒體預覽區域 */}
      {currentMediaUrl ? (
        <div className="relative border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              {getMediaTypeIcon()}
              <span className="font-medium text-gray-700">
                {mediaType === 'image' ? '圖片預覽' : '影片預覽'}
              </span>
            </div>
            <button
              onClick={handleRemoveMedia}
              disabled={disabled}
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {mediaType === 'image' ? (
            <img
              src={currentMediaUrl}
              alt={altText}
              className="max-w-full h-auto max-h-64 rounded-lg mx-auto"
            />
          ) : (
            <div className="relative">
              <video
                src={currentMediaUrl}
                controls
                className="max-w-full h-auto max-h-64 rounded-lg mx-auto"
                poster={currentThumbnailUrl}
              >
                您的瀏覽器不支援影片播放
              </video>
            </div>
          )}

          {/* 替代文字輸入 */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              替代文字（無障礙支援）
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => handleAltTextChange(e.target.value)}
              disabled={disabled}
              placeholder={`描述這個${mediaType === 'image' ? '圖片' : '影片'}的內容...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
            />
          </div>
        </div>
      ) : (
        /* 上傳區域 */
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptTypes()}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600">上傳中... {Math.round(progress)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                {getMediaTypeIcon()}
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {dragOver ? '放開以上傳檔案' : `上傳${mediaType === 'image' ? '圖片' : '影片'}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  點擊選擇或拖拽檔案到此處
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {mediaType === 'image' 
                    ? '支援 JPEG, PNG, GIF, WebP 格式' 
                    : '支援 MP4, WebM, OGG 格式'
                  } • {getMaxSizeText()}
                </p>
              </div>
              <div className="flex justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 替代文字輸入（當沒有媒體時） */}
      {!currentMediaUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            替代文字（上傳後可編輯）
          </label>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            disabled={disabled}
            placeholder={`描述${mediaType === 'image' ? '圖片' : '影片'}內容...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
          />
        </div>
      )}

      {/* 上傳進度組件 */}
      <UploadProgress
        isUploading={isUploading}
        progress={progress}
        fileName={currentMediaUrl ? undefined : undefined} // 只在上傳新檔案時顯示檔名
        error={error}
        onComplete={() => {
          reset()
        }}
        onCancel={handleCancelUpload}
        showPercentage={true}
        showFileName={true}
        size="small"
      />
    </div>
  )
}
