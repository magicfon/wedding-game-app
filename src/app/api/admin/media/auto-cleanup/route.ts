import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 自動清理設定
const AUTO_CLEANUP_CONFIG = {
  // 檔案多少天沒使用就清理（預設 7 天）
  UNUSED_DAYS_THRESHOLD: 7,
  // 最大清理檔案數量（避免一次清理太多）
  MAX_CLEANUP_COUNT: 50,
  // 最小檔案大小才清理（KB，避免清理很小的檔案）
  MIN_FILE_SIZE_KB: 10
}

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 開始自動媒體檔案清理...')
    
    const supabase = createSupabaseAdmin()
    
    // 1. 獲取所有 Storage 檔案
    const { data: files, error: filesError } = await supabase.storage
      .from('media')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' } // 先清理舊檔案
      })

    if (filesError) {
      console.error('❌ 獲取檔案列表失敗:', filesError)
      return NextResponse.json({
        error: '無法獲取檔案列表',
        details: filesError.message
      }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Storage 中沒有檔案',
        deleted_count: 0,
        total_files: 0
      })
    }

    // 2. 獲取資料庫中使用的媒體URL
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('media_url, media_thumbnail_url')
      .or('media_url.not.is.null,media_thumbnail_url.not.is.null')

    if (questionsError) {
      console.error('❌ 獲取題目媒體URL失敗:', questionsError)
      return NextResponse.json({
        error: '無法獲取題目媒體URL',
        details: questionsError.message
      }, { status: 500 })
    }

    // 3. 建立使用中檔案集合
    const usedFiles = new Set<string>()
    questions?.forEach(question => {
      if (question.media_url) {
        const fileName = question.media_url.split('/').pop()
        if (fileName) usedFiles.add(fileName)
      }
      if (question.media_thumbnail_url) {
        const fileName = question.media_thumbnail_url.split('/').pop()
        if (fileName) usedFiles.add(fileName)
      }
    })

    // 4. 篩選符合自動清理條件的檔案
    const now = new Date()
    const thresholdDate = new Date(now.getTime() - (AUTO_CLEANUP_CONFIG.UNUSED_DAYS_THRESHOLD * 24 * 60 * 60 * 1000))
    
    const candidatesForCleanup = files.filter(file => {
      // 檔案必須未被使用
      if (usedFiles.has(file.name)) return false
      
      // 檔案必須超過閾值天數
      const fileDate = new Date(file.created_at)
      if (fileDate > thresholdDate) return false
      
      // 檔案大小必須超過最小閾值
      const fileSizeKB = (file.metadata?.size || 0) / 1024
      if (fileSizeKB < AUTO_CLEANUP_CONFIG.MIN_FILE_SIZE_KB) return false
      
      return true
    })

    // 5. 限制清理數量
    const filesToDelete = candidatesForCleanup
      .slice(0, AUTO_CLEANUP_CONFIG.MAX_CLEANUP_COUNT)
      .map(file => file.name)

    if (filesToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有符合自動清理條件的檔案',
        deleted_count: 0,
        total_files: files.length,
        used_files: usedFiles.size,
        candidates_found: candidatesForCleanup.length,
        cleanup_criteria: {
          unused_days_threshold: AUTO_CLEANUP_CONFIG.UNUSED_DAYS_THRESHOLD,
          min_file_size_kb: AUTO_CLEANUP_CONFIG.MIN_FILE_SIZE_KB,
          max_cleanup_count: AUTO_CLEANUP_CONFIG.MAX_CLEANUP_COUNT
        }
      })
    }

    console.log(`🗑️ 準備自動清理 ${filesToDelete.length} 個檔案`)

    // 6. 執行刪除
    const { data: deleteResult, error: deleteError } = await supabase.storage
      .from('media')
      .remove(filesToDelete)

    if (deleteError) {
      console.error('❌ 自動刪除檔案失敗:', deleteError)
      return NextResponse.json({
        error: '自動刪除檔案失敗',
        details: deleteError.message,
        attempted_files: filesToDelete
      }, { status: 500 })
    }

    // 7. 計算統計資料
    const deletedFilesInfo = candidatesForCleanup
      .slice(0, AUTO_CLEANUP_CONFIG.MAX_CLEANUP_COUNT)
      .map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
        age_days: Math.floor((now.getTime() - new Date(file.created_at).getTime()) / (24 * 60 * 60 * 1000))
      }))

    const totalSizeSaved = deletedFilesInfo.reduce((sum, file) => sum + file.size, 0)

    console.log(`✅ 自動清理完成，刪除 ${deleteResult?.length || 0} 個檔案，節省 ${(totalSizeSaved / (1024 * 1024)).toFixed(2)} MB`)

    return NextResponse.json({
      success: true,
      message: `自動清理完成，刪除 ${deleteResult?.length || 0} 個檔案`,
      deleted_count: deleteResult?.length || 0,
      total_files: files.length,
      used_files: usedFiles.size,
      remaining_files: files.length - (deleteResult?.length || 0),
      candidates_found: candidatesForCleanup.length,
      total_size_saved: totalSizeSaved,
      size_saved_mb: (totalSizeSaved / (1024 * 1024)).toFixed(2),
      deleted_files: deletedFilesInfo,
      cleanup_criteria: {
        unused_days_threshold: AUTO_CLEANUP_CONFIG.UNUSED_DAYS_THRESHOLD,
        min_file_size_kb: AUTO_CLEANUP_CONFIG.MIN_FILE_SIZE_KB,
        max_cleanup_count: AUTO_CLEANUP_CONFIG.MAX_CLEANUP_COUNT
      }
    })

  } catch (error) {
    console.error('❌ 自動媒體檔案清理錯誤:', error)
    return NextResponse.json({
      error: '自動媒體檔案清理失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // 返回自動清理配置和狀態
    const supabase = createSupabaseAdmin()
    
    // 獲取基本統計
    const { data: files, error: filesError } = await supabase.storage
      .from('media')
      .list('', { limit: 1000 })

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('media_url, media_thumbnail_url')
      .or('media_url.not.is.null,media_thumbnail_url.not.is.null')

    if (filesError || questionsError) {
      return NextResponse.json({
        error: '無法獲取統計資料',
        details: filesError?.message || questionsError?.message
      }, { status: 500 })
    }

    // 計算符合清理條件的檔案
    const usedFiles = new Set<string>()
    questions?.forEach(question => {
      if (question.media_url) {
        const fileName = question.media_url.split('/').pop()
        if (fileName) usedFiles.add(fileName)
      }
      if (question.media_thumbnail_url) {
        const fileName = question.media_thumbnail_url.split('/').pop()
        if (fileName) usedFiles.add(fileName)
      }
    })

    const now = new Date()
    const thresholdDate = new Date(now.getTime() - (AUTO_CLEANUP_CONFIG.UNUSED_DAYS_THRESHOLD * 24 * 60 * 60 * 1000))
    
    const candidatesForCleanup = files?.filter(file => {
      if (usedFiles.has(file.name)) return false
      const fileDate = new Date(file.created_at)
      if (fileDate > thresholdDate) return false
      const fileSizeKB = (file.metadata?.size || 0) / 1024
      if (fileSizeKB < AUTO_CLEANUP_CONFIG.MIN_FILE_SIZE_KB) return false
      return true
    }) || []

    return NextResponse.json({
      success: true,
      config: AUTO_CLEANUP_CONFIG,
      statistics: {
        total_files: files?.length || 0,
        used_files: usedFiles.size,
        unused_files: (files?.length || 0) - usedFiles.size,
        candidates_for_cleanup: candidatesForCleanup.length,
        will_be_deleted: Math.min(candidatesForCleanup.length, AUTO_CLEANUP_CONFIG.MAX_CLEANUP_COUNT)
      },
      next_cleanup_preview: candidatesForCleanup
        .slice(0, AUTO_CLEANUP_CONFIG.MAX_CLEANUP_COUNT)
        .map(file => ({
          name: file.name,
          size_mb: ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
          age_days: Math.floor((now.getTime() - new Date(file.created_at).getTime()) / (24 * 60 * 60 * 1000))
        }))
    })

  } catch (error) {
    console.error('❌ 獲取自動清理狀態錯誤:', error)
    return NextResponse.json({
      error: '獲取自動清理狀態失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
