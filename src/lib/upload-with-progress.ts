'use client'

/**
 * 支援進度追蹤的檔案上傳工具
 * 由於瀏覽器限制，這裡使用模擬進度來演示功能
 * 在實際應用中，可以結合 XMLHttpRequest 或 fetch with ReadableStream 來實現真實進度
 */

export interface UploadProgressCallback {
  (progress: number, status: string): void
}

export interface UploadOptions {
  url: string
  file: File
  data?: Record<string, any>
  onProgress?: UploadProgressCallback
  signal?: AbortSignal
}

export interface UploadResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * 模擬進度的檔案上傳函數
 * @param options 上傳選項
 * @returns 上傳結果
 */
export async function uploadWithProgress(options: UploadOptions): Promise<UploadResult> {
  const { url, file, data = {}, onProgress, signal } = options

  return new Promise((resolve) => {
    // 檢查是否已經取消
    if (signal?.aborted) {
      resolve({ success: false, error: '上傳已取消' })
      return
    }

    // 創建 FormData
    const formData = new FormData()
    formData.append('file', file)
    
    // 添加其他數據
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })

    // 監聽取消信號
    const abortHandler = () => {
      resolve({ success: false, error: '上傳已取消' })
    }
    
    if (signal) {
      signal.addEventListener('abort', abortHandler)
    }

    // 模擬上傳進度
    let progress = 0
    const progressInterval = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(progressInterval)
        return
      }

      // 根據檔案大小調整進度速度
      const fileSizeMB = file.size / (1024 * 1024)
      const progressStep = Math.max(1, Math.min(5, 10 / fileSizeMB))
      
      progress = Math.min(progress + progressStep, 95)
      
      let status = '正在準備上傳...'
      if (progress >= 10 && progress < 30) status = '正在上傳檔案...'
      if (progress >= 30 && progress < 70) status = '正在傳輸資料...'
      if (progress >= 70 && progress < 90) status = '正在處理檔案...'
      if (progress >= 90) status = '即將完成...'
      
      onProgress?.(progress, status)
    }, 200)

    // 執行實際上傳
    fetch(url, {
      method: 'POST',
      body: formData,
      signal
    })
    .then(async (response) => {
      if (signal?.aborted) {
        clearInterval(progressInterval)
        return
      }

      // 完成進度
      progress = 100
      onProgress?.(progress, '上傳完成')
      clearInterval(progressInterval)

      const result = await response.json()
      
      if (response.ok && result.success) {
        resolve({ success: true, data: result.data })
      } else {
        resolve({ 
          success: false, 
          error: result.error || '上傳失敗' 
        })
      }
    })
    .catch((error) => {
      if (signal?.aborted) {
        clearInterval(progressInterval)
        return
      }

      clearInterval(progressInterval)
      onProgress?.(0, '上傳失敗')
      resolve({ 
        success: false, 
        error: error.message || '網路錯誤' 
      })
    })
    .finally(() => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
    })
  })
}

/**
 * 使用 XMLHttpRequest 的真實進度上傳（備用方案）
 * 注意：這需要伺服器端支援進度回報
 */
export function uploadWithXHR(options: UploadOptions): Promise<UploadResult> {
  const { url, file, data = {}, onProgress, signal } = options

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    
    // 監聽進度
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100
        onProgress?.(progress, '正在上傳...')
      }
    })

    // 監聽完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText)
          if (result.success) {
            resolve({ success: true, data: result.data })
          } else {
            resolve({ success: false, error: result.error })
          }
        } catch (error) {
          resolve({ success: false, error: '響應格式錯誤' })
        }
      } else {
        resolve({ success: false, error: `HTTP ${xhr.status}` })
      }
    })

    // 監聽錯誤
    xhr.addEventListener('error', () => {
      resolve({ success: false, error: '網路錯誤' })
    })

    // 監聽取消
    xhr.addEventListener('abort', () => {
      resolve({ success: false, error: '上傳已取消' })
    })

    // 處理取消信號
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort()
      })
    }

    // 準備數據
    const formData = new FormData()
    formData.append('file', file)
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value)
    })

    // 發送請求
    xhr.open('POST', url)
    xhr.send(formData)
  })
}

/**
 * 創建可取消的上傳控制器
 */
export function createUploadController() {
  const controller = new AbortController()
  
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
    isAborted: () => controller.signal.aborted
  }
}

/**
 * 格式化檔案大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 估算上傳時間
 */
export function estimateUploadTime(fileSize: number, uploadSpeed: number = 1024 * 1024): number {
  // uploadSpeed 預設 1MB/s
  return fileSize / uploadSpeed // 秒
}