'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import Layout from '@/components/Layout'
import UploadProgress, { useUploadProgress } from '@/components/UploadProgress'
import { uploadWithProgress, createUploadController, formatFileSize } from '@/lib/upload-with-progress'
import { Camera, Upload, Heart, Lock, Globe, Image as ImageIcon, X } from 'lucide-react'

export default function PhotoUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blessingMessage, setBlessingMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadController, setUploadController] = useState<ReturnType<typeof createUploadController> | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { isReady, isLoggedIn, profile, login, loading } = useLiff()
  
  // 使用上傳進度 Hook
  const { progress, isUploading, error, startUpload, updateProgress, completeUpload, failUpload, reset } = useUploadProgress()

  // 檢查登入狀態
  useEffect(() => {
    if (isReady && !loading && !isLoggedIn) {
      // 用戶未登入，提示登入
      alert('請先登入才能上傳照片')
      router.push('/')
    }
  }, [isReady, isLoggedIn, loading, router])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案')
      return
    }

    // 檢查檔案大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片檔案不能超過 5MB')
      return
    }

    setSelectedFile(file)

    // 創建預覽
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !profile) return

    // 創建上傳控制器
    const controller = createUploadController()
    setUploadController(controller)

    try {
      startUpload()

      // 使用帶進度的上傳函數
      const result = await uploadWithProgress({
        url: '/api/photo/upload',
        file: selectedFile,
        data: {
          blessingMessage,
          isPublic: isPublic.toString(),
          uploaderLineId: profile.userId
        },
        onProgress: (progress, status) => {
          updateProgress(progress)
        },
        signal: controller.signal
      })

      if (!result.success) {
        throw new Error(result.error || '上傳失敗')
      }

      completeUpload()
      setUploadSuccess(true)
      
      // 清理表單
      setSelectedFile(null)
      setPreview(null)
      setBlessingMessage('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // 2秒後跳轉到照片牆
      setTimeout(() => {
        router.push('/photo-wall')
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上傳失敗，請稍後再試'
      failUpload(errorMessage)
      console.error('Upload error:', error)
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

  const clearSelection = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Layout title="照片上傳">
      {/* 成功訊息彈出框 */}
      {uploadSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md text-center transform animate-scaleIn">
            <div className="mb-4">
              <Heart className="w-16 h-16 text-pink-500 mx-auto animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-2">上傳成功！</h3>
            <p className="text-black">感謝您的分享 ❤️</p>
            <p className="text-sm text-gray-500 mt-4">即將跳轉到照片牆...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-2xl mx-auto">

        {/* 隱私設定 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">隱私設定</h3>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="w-4 h-4 text-pink-500"
              />
              <Globe className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-black">公開展示</div>
                <div className="text-sm text-black">所有賓客都可以看到並投票</div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="w-4 h-4 text-pink-500"
              />
              <Lock className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-black">私下傳送</div>
                <div className="text-sm text-black">只有林敬和孟庭可以看到</div>
              </div>
            </label>
          </div>
        </div>

        {/* 上傳區域 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center mb-8">
            <Camera className="w-10 h-10 text-pink-500 mx-auto mb-4" />
            <p className="text-black">上傳照片並留下祝福的話語</p>
          </div>

          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-black mb-2">點擊選擇照片</p>
              <p className="text-sm text-black">支援 JPG, PNG 格式，最大 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden text-black"
              />
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-96 object-cover rounded-xl"
              />
              <button
                onClick={clearSelection}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 祝福訊息 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
            <Heart className="w-5 h-5 text-pink-500 mr-2" />
            祝福訊息
          </h3>
          <textarea
            value={blessingMessage}
            onChange={(e) => setBlessingMessage(e.target.value)}
            placeholder="寫下您對新人的祝福..."
            className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-black"
            maxLength={200}
          />
          <div className="text-right text-sm text-black mt-2">
            {blessingMessage.length}/200
          </div>
        </div>

        {/* 上傳按鈕 */}
        <div className="text-center">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              !selectedFile || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>上傳中... {Math.round(progress)}%</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5" />
                <span>上傳照片</span>
              </div>
            )}
          </button>
          
          {/* 顯示檔案資訊 */}
          {selectedFile && !isUploading && (
            <div className="mt-3 text-sm text-gray-600">
              檔案大小: {formatFileSize(selectedFile.size)}
            </div>
          )}
        </div>

        {/* 提示 */}
        <div className="bg-blue-50 rounded-xl p-4 mt-6 text-center">
          <p className="text-black text-sm">
            💡 上傳的照片將會出現在照片牆和快門傳情中，讓所有賓客一起欣賞美好回憶！
          </p>
        </div>
      </div>

      {/* 上傳進度組件 */}
      <UploadProgress
        isUploading={isUploading}
        progress={progress}
        fileName={selectedFile?.name}
        error={error}
        onComplete={() => {
          reset()
        }}
        onCancel={handleCancelUpload}
        showPercentage={true}
        showFileName={true}
        size="medium"
      />
    </Layout>
  )
}
