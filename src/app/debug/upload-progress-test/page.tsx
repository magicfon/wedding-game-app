'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import UploadProgress, { useUploadProgress } from '@/components/UploadProgress'
import { uploadWithProgress, createUploadController, formatFileSize } from '@/lib/upload-with-progress'
import { Upload, Play, RotateCcw, X } from 'lucide-react'

export default function UploadProgressTestPage() {
  const [testFile, setTestFile] = useState<File | null>(null)
  const [testController, setTestController] = useState<ReturnType<typeof createUploadController> | null>(null)
  const [testResults, setTestResults] = useState<Array<{ time: number; success: boolean; error?: string }>>([])
  
  // 使用上傳進度 Hook
  const { progress, isUploading, error, startUpload, updateProgress, completeUpload, failUpload, reset } = useUploadProgress()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setTestFile(file)
    }
  }

  const handleTestUpload = async () => {
    if (!testFile) return

    const controller = createUploadController()
    setTestController(controller)

    const startTime = Date.now()

    try {
      startUpload()

      // 測試實際上傳（使用真實的 API）
      const result = await uploadWithProgress({
        url: '/api/photo/upload',
        file: testFile,
        data: {
          blessingMessage: '這是測試上傳',
          isPublic: 'false',
          uploaderLineId: 'test-user-id'
        },
        onProgress: (progress, status) => {
          updateProgress(progress)
        },
        signal: controller.signal
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      if (result.success) {
        completeUpload()
        setTestResults(prev => [...prev, {
          time: duration,
          success: true
        }])
      } else {
        failUpload(result.error || '上傳失敗')
        setTestResults(prev => [...prev, {
          time: duration,
          success: false,
          error: result.error
        }])
      }
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      const errorMessage = error instanceof Error ? error.message : '上傳失敗'
      
      failUpload(errorMessage)
      setTestResults(prev => [...prev, {
        time: duration,
        success: false,
        error: errorMessage
      }])
    } finally {
      setTestController(null)
    }
  }

  const handleSimulateUpload = async () => {
    const startTime = Date.now()
    
    // 模擬上傳進度
    startUpload()
    
    const steps = [10, 25, 40, 60, 75, 85, 95, 100]
    const stepDuration = 300 // 每步 300ms
    
    for (const stepProgress of steps) {
      await new Promise(resolve => setTimeout(resolve, stepDuration))
      updateProgress(stepProgress)
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    completeUpload()
    setTestResults(prev => [...prev, {
      time: duration,
      success: true
    }])
  }

  const handleCancelUpload = () => {
    if (testController) {
      testController.cancel()
      setTestController(null)
      reset()
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  const averageTime = testResults.length > 0 
    ? testResults.reduce((sum, result) => sum + result.time, 0) / testResults.length 
    : 0

  const successRate = testResults.length > 0 
    ? (testResults.filter(result => result.success).length / testResults.length) * 100 
    : 0

  return (
    <Layout title="上傳進度測試">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 測試控制面板 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-black">上傳進度測試</h2>
          
          {/* 檔案選擇 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇測試檔案
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {testFile && (
              <div className="mt-2 text-sm text-gray-600">
                已選擇: {testFile.name} ({formatFileSize(testFile.size)})
              </div>
            )}
          </div>

          {/* 測試按鈕 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestUpload}
              disabled={!testFile || isUploading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>測試實際上傳</span>
            </button>
            
            <button
              onClick={handleSimulateUpload}
              disabled={isUploading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>模擬上傳</span>
            </button>
            
            <button
              onClick={handleCancelUpload}
              disabled={!isUploading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              <span>取消上傳</span>
            </button>
            
            <button
              onClick={clearResults}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
              <span>清除結果</span>
            </button>
          </div>
        </div>

        {/* 統計資訊 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">測試統計</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{testResults.length}</div>
                <div className="text-sm text-gray-600">總測試次數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">成功率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{(averageTime / 1000).toFixed(2)}s</div>
                <div className="text-sm text-gray-600">平均時間</div>
              </div>
            </div>
          </div>
        )}

        {/* 測試結果列表 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">測試結果</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-black">
                      測試 #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {(result.time / 1000).toFixed(2)}s
                    </span>
                    {result.error && (
                      <span className="text-xs text-red-600 max-w-xs truncate">
                        {result.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 功能說明 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-black">功能說明</h3>
          <ul className="space-y-2 text-sm text-black">
            <li>• <strong>實際上傳測試：</strong>使用真實的 API 進行檔案上傳，測試完整的上傳流程</li>
            <li>• <strong>模擬上傳測試：</strong>模擬上傳進度，用於測試進度顯示功能</li>
            <li>• <strong>取消上傳：</strong>測試上傳取消功能，確保能正確中斷上傳</li>
            <li>• <strong>統計資訊：</strong>顯示測試次數、成功率和平均時間</li>
            <li>• <strong>進度指示器：</strong>顯示詳細的上傳進度、狀態和錯誤訊息</li>
          </ul>
        </div>
      </div>

      {/* 上傳進度組件 */}
      <UploadProgress
        isUploading={isUploading}
        progress={progress}
        fileName={testFile?.name}
        error={error}
        onComplete={() => {
          reset()
        }}
        onCancel={handleCancelUpload}
        showPercentage={true}
        showFileName={true}
        size="large"
      />
    </Layout>
  )
}