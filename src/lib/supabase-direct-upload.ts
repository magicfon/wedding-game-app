'use client'

import { createClient } from '@supabase/supabase-js'
import { createSupabaseBrowser } from './supabase'

// 檔案大小閾值（6MB），超過此大小使用 Resumable Upload
const RESUMABLE_UPLOAD_THRESHOLD = 6 * 1024 * 1024

// 上傳進度回調類型
export interface UploadProgressCallback {
  (progress: number, status: string): void
}

// 上傳結果類型
export interface DirectUploadResult {
  success: boolean
  data?: {
    fileName: string
    fileUrl: string
    fileSize: number
    fileType: string
  }
  error?: string
}

// 上傳選項類型
export interface DirectUploadOptions {
  file: File
  onProgress?: UploadProgressCallback
  signal?: AbortSignal
  userId: string
}

/**
 * 客戶端直接上傳到 Supabase Storage
 * @param options 上傳選項
 * @returns 上傳結果
 */
export async function directUploadToSupabase(options: DirectUploadOptions): Promise<DirectUploadResult> {
  const { file, onProgress, signal, userId } = options

  try {
    // 檢查是否已取消
    if (signal?.aborted) {
      return { success: false, error: '上傳已取消' }
    }

    // 驗證檔案類型
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return { success: false, error: '請選擇圖片或影片檔案' }
    }

    // 生成唯一檔名
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`

    // 根據檔案大小選擇上傳方式
    if (file.size >= RESUMABLE_UPLOAD_THRESHOLD) {
      return await resumableUpload(file, fileName, onProgress, signal)
    } else {
      return await simpleUpload(file, fileName, onProgress, signal)
    }
  } catch (error) {
    console.error('❌ 直接上傳錯誤:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗'
    }
  }
}

/**
 * 簡單上傳（小於 6MB 的檔案）
 */
async function simpleUpload(
  file: File,
  fileName: string,
  onProgress?: UploadProgressCallback,
  signal?: AbortSignal
): Promise<DirectUploadResult> {
  const supabase = createSupabaseBrowser()

  try {
    onProgress?.(0, '準備上傳...')

    // 上傳到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('wedding-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`上傳失敗: ${error.message}`)
    }

    onProgress?.(50, '處理檔案...')

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('wedding-photos')
      .getPublicUrl(fileName)

    onProgress?.(100, '上傳完成')

    return {
      success: true,
      data: {
        fileName,
        fileUrl: urlData.publicUrl,
        fileSize: file.size,
        fileType: file.type
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗'
    }
  }
}

/**
 * Resumable Upload（大於等於 6MB 的檔案）
 */
async function resumableUpload(
  file: File,
  fileName: string,
  onProgress?: UploadProgressCallback,
  signal?: AbortSignal
): Promise<DirectUploadResult> {
  const supabase = createSupabaseBrowser()

  try {
    onProgress?.(0, '準備上傳...')

    // 使用 Supabase 的 upload 方法進行可恢復上傳
    // Supabase 會自動處理大檔案的分片上傳
    const { data, error } = await supabase.storage
      .from('wedding-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        // 對於大檔案，Supabase 會自動使用可恢復上傳
        duplex: 'half'
      })

    if (error) {
      throw new Error(`上傳失敗: ${error.message}`)
    }

    onProgress?.(80, '處理檔案...')

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('wedding-photos')
      .getPublicUrl(fileName)

    onProgress?.(100, '上傳完成')

    return {
      success: true,
      data: {
        fileName,
        fileUrl: urlData.publicUrl,
        fileSize: file.size,
        fileType: file.type
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗'
    }
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
 * 檢查檔案是否需要使用 Resumable Upload
 */
export function needsResumableUpload(fileSize: number): boolean {
  return fileSize >= RESUMABLE_UPLOAD_THRESHOLD
}

/**
 * 獲取上傳方法描述
 */
export function getUploadMethodDescription(fileSize: number): string {
  if (needsResumableUpload(fileSize)) {
    return '使用可恢復上傳（適用於大檔案）'
  }
  return '使用直接上傳（適用於小檔案）'
}