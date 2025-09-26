import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 開始清理未使用的媒體檔案...')
    
    const supabase = createSupabaseAdmin()
    
    // 1. 獲取 Storage 中的所有媒體檔案
    console.log('📁 獲取 Storage 中的檔案列表...')
    const { data: files, error: filesError } = await supabase.storage
      .from('media')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
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
        message: 'Storage 中沒有檔案需要清理',
        deleted_count: 0,
        total_files: 0
      })
    }

    console.log(`📊 Storage 中共有 ${files.length} 個檔案`)

    // 2. 獲取資料庫中所有使用的媒體URL
    console.log('🔍 檢查資料庫中使用的媒體檔案...')
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, media_url, media_thumbnail_url')
      .or('media_url.not.is.null,media_thumbnail_url.not.is.null')

    if (questionsError) {
      console.error('❌ 獲取題目媒體URL失敗:', questionsError)
      return NextResponse.json({
        error: '無法獲取題目媒體URL',
        details: questionsError.message
      }, { status: 500 })
    }

    // 3. 提取所有使用中的檔案名稱
    const usedFiles = new Set<string>()
    
    questions?.forEach(question => {
      if (question.media_url) {
        // 從完整URL中提取檔案名稱
        const fileName = question.media_url.split('/').pop()
        if (fileName) {
          usedFiles.add(fileName)
        }
      }
      if (question.media_thumbnail_url) {
        const fileName = question.media_thumbnail_url.split('/').pop()
        if (fileName) {
          usedFiles.add(fileName)
        }
      }
    })

    console.log(`📋 資料庫中使用了 ${usedFiles.size} 個媒體檔案`)
    console.log('🔗 使用中的檔案:', Array.from(usedFiles))

    // 4. 找出未使用的檔案
    const unusedFiles = files.filter(file => !usedFiles.has(file.name))
    
    console.log(`🗑️ 發現 ${unusedFiles.length} 個未使用的檔案`)
    
    if (unusedFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有檔案都在使用中，無需清理',
        deleted_count: 0,
        total_files: files.length,
        used_files: usedFiles.size
      })
    }

    // 5. 刪除未使用的檔案
    console.log('🗑️ 開始刪除未使用的檔案...')
    const filesToDelete = unusedFiles.map(file => file.name)
    
    const { data: deleteResult, error: deleteError } = await supabase.storage
      .from('media')
      .remove(filesToDelete)

    if (deleteError) {
      console.error('❌ 刪除檔案失敗:', deleteError)
      return NextResponse.json({
        error: '刪除檔案失敗',
        details: deleteError.message,
        unused_files: filesToDelete
      }, { status: 500 })
    }

    console.log(`✅ 成功刪除 ${deleteResult?.length || 0} 個檔案`)

    // 6. 計算節省的空間（估算）
    const deletedFilesSizes = unusedFiles.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      created_at: file.created_at
    }))

    const totalSizeSaved = deletedFilesSizes.reduce((sum, file) => sum + file.size, 0)

    return NextResponse.json({
      success: true,
      message: `成功清理 ${deleteResult?.length || 0} 個未使用的媒體檔案`,
      deleted_count: deleteResult?.length || 0,
      total_files: files.length,
      used_files: usedFiles.size,
      remaining_files: files.length - (deleteResult?.length || 0),
      deleted_files: deletedFilesSizes,
      total_size_saved: totalSizeSaved,
      size_saved_mb: (totalSizeSaved / (1024 * 1024)).toFixed(2)
    })

  } catch (error) {
    console.error('❌ 媒體檔案清理錯誤:', error)
    return NextResponse.json({
      error: '媒體檔案清理失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 分析媒體檔案使用情況...')
    
    const supabase = createSupabaseAdmin()
    
    // 1. 獲取 Storage 中的檔案統計
    const { data: files, error: filesError } = await supabase.storage
      .from('media')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      return NextResponse.json({
        error: '無法獲取檔案列表',
        details: filesError.message
      }, { status: 500 })
    }

    // 2. 獲取資料庫中使用的媒體URL
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, media_url, media_thumbnail_url, media_type')
      .or('media_url.not.is.null,media_thumbnail_url.not.is.null')

    if (questionsError) {
      return NextResponse.json({
        error: '無法獲取題目媒體URL',
        details: questionsError.message
      }, { status: 500 })
    }

    // 3. 分析使用情況
    const usedFiles = new Set<string>()
    const questionMediaMap: { [fileName: string]: any[] } = {}
    
    questions?.forEach(question => {
      if (question.media_url) {
        const fileName = question.media_url.split('/').pop()
        if (fileName) {
          usedFiles.add(fileName)
          if (!questionMediaMap[fileName]) {
            questionMediaMap[fileName] = []
          }
          questionMediaMap[fileName].push({
            id: question.id,
            question_text: question.question_text?.substring(0, 50) + '...',
            media_type: question.media_type,
            url_type: 'main'
          })
        }
      }
      if (question.media_thumbnail_url) {
        const fileName = question.media_thumbnail_url.split('/').pop()
        if (fileName) {
          usedFiles.add(fileName)
          if (!questionMediaMap[fileName]) {
            questionMediaMap[fileName] = []
          }
          questionMediaMap[fileName].push({
            id: question.id,
            question_text: question.question_text?.substring(0, 50) + '...',
            media_type: question.media_type,
            url_type: 'thumbnail'
          })
        }
      }
    })

    const unusedFiles = files?.filter(file => !usedFiles.has(file.name)) || []
    const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
    const unusedSize = unusedFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)

    return NextResponse.json({
      success: true,
      analysis: {
        total_files: files?.length || 0,
        used_files: usedFiles.size,
        unused_files: unusedFiles.length,
        total_size_bytes: totalSize,
        unused_size_bytes: unusedSize,
        total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
        unused_size_mb: (unusedSize / (1024 * 1024)).toFixed(2),
        space_utilization: files?.length ? ((usedFiles.size / files.length) * 100).toFixed(1) : '0'
      },
      unused_files: unusedFiles.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        size_mb: ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
        created_at: file.created_at,
        last_modified: file.updated_at
      })),
      used_files_details: Object.entries(questionMediaMap).map(([fileName, questions]) => ({
        file_name: fileName,
        used_by_questions: questions
      }))
    })

  } catch (error) {
    console.error('❌ 媒體檔案分析錯誤:', error)
    return NextResponse.json({
      error: '媒體檔案分析失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
