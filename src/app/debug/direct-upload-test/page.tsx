'use client'

import { useState, useRef } from 'react'
import { useLiff } from '@/hooks/useLiff'
import Layout from '@/components/Layout'
import UploadProgress, { useUploadProgress } from '@/components/UploadProgress'
import { directUploadToSupabase, formatFileSize, needsResumableUpload } from '@/lib/supabase-direct-upload'
import { Upload, FileText, CheckCircle, XCircle, Info } from 'lucide-react'

interface TestResult {
  fileName: string
  fileSize: number
  uploadTime: number
  success: boolean
  error?: string
  uploadMethod: string
}

export default function DirectUploadTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isTesting, setIsTesting] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isReady, isLoggedIn, profile } = useLiff()
  const { progress, isUploading, error, startUpload, updateProgress, completeUpload, failUpload, reset } = useUploadProgress()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      reset()
    }
  }

  const runTest = async () => {
    if (!selectedFile || !profile) return

    setIsTesting(true)
    const startTime = Date.now()

    try {
      startUpload()

      const result = await directUploadToSupabase({
        file: selectedFile,
        userId: profile.userId,
        onProgress: (progress, status) => {
          updateProgress(progress)
        }
      })

      const endTime = Date.now()
      const uploadTime = endTime - startTime

      const testResult: TestResult = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadTime,
        success: result.success,
        error: result.error,
        uploadMethod: needsResumableUpload(selectedFile.size) ? 'Resumable Upload' : 'Direct Upload'
      }

      setTestResults(prev => [testResult, ...prev])
      
      if (result.success) {
        completeUpload()
      } else {
        failUpload(result.error || '上傳失敗')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '測試失敗'
      failUpload(errorMessage)
      
      const testResult: TestResult = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadTime: Date.now() - startTime,
        success: false,
        error: errorMessage,
        uploadMethod: needsResumableUpload(selectedFile.size) ? 'Resumable Upload' : 'Direct Upload'
      }

      setTestResults(prev => [testResult, ...prev])
    } finally {
      setIsTesting(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
    reset()
  }

  const getUploadMethodColor = (method: string) => {
    return method === 'Resumable Upload' ? 'text-purple-600' : 'text-blue-600'
  }

  const getUploadMethodIcon = (method: string) => {
    return method === 'Resumable Upload' ? '🔄' : '⚡'
  }

  if (!isReady) {
    return (
      <Layout title="直接上傳測試">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    )
  }

  if (!isLoggedIn) {
    return (
      <Layout title="直接上傳測試">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Info className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">需要登入</h2>
            <p className="text-yellow-700">請先登入才能使用直接上傳測試功能</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="直接上傳測試">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 測試說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">直接上傳測試</h2>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• 測試客戶端直接上傳到 Supabase Storage 的功能</p>
            <p>• 小檔案 (&lt;6MB) 使用直接上傳，大檔案 (&gt;=6MB) 使用可恢復上傳</p>
            <p>• 可以測試各種大小的檔案上傳性能和可靠性</p>
            <p>• 測試結果會顯示上傳時間、成功狀態和使用的上傳方法</p>
          </div>
        </div>

        {/* 檔案選擇區域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-black mb-4">選擇測試檔案</h3>
          
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                  <div>
                    <p className="font-medium text-black">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      {getUploadMethodIcon(needsResumableUpload(selectedFile.size) ? 'Resumable Upload' : 'Direct Upload')} 
                      {' '}{needsResumableUpload(selectedFile.size) ? '將使用可恢復上傳' : '將使用直接上傳'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-lg text-black">點擊選擇圖片檔案</p>
                  <p className="text-sm text-gray-500">支援各種大小的圖片檔案</p>
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex space-x-4">
              <button
                onClick={runTest}
                disabled={!selectedFile || isTesting || isUploading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isTesting || isUploading ? '測試中...' : '開始測試'}
              </button>
              
              <button
                onClick={clearResults}
                disabled={testResults.length === 0}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                清除結果
              </button>
            </div>
          </div>
        </div>

        {/* 上傳進度 */}
        {isUploading && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-black mb-4">上傳進度</h3>
            <UploadProgress
              isUploading={isUploading}
              progress={progress}
              fileName={selectedFile?.name}
              error={error}
              onComplete={() => {}}
              onCancel={() => {}}
              showPercentage={true}
              showFileName={true}
              size="medium"
            />
          </div>
        )}

        {/* 測試結果 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-black mb-4">測試結果</h3>
            
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-medium text-black">{result.fileName}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">檔案大小:</span>
                          <span className="ml-2 text-black">{formatFileSize(result.fileSize)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">上傳時間:</span>
                          <span className="ml-2 text-black">{(result.uploadTime / 1000).toFixed(2)}s</span>
                        </div>
                        <div>
                          <span className="text-gray-500">上傳方法:</span>
                          <span className={`ml-2 ${getUploadMethodColor(result.uploadMethod)}`}>
                            {getUploadMethodIcon(result.uploadMethod)} {result.uploadMethod}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">狀態:</span>
                          <span className={`ml-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                            {result.success ? '成功' : '失敗'}
                          </span>
                        </div>
                      </div>
                      
                      {result.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          錯誤: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}