import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 開始清理未使用的媒體檔案...')

    const supabase = createSupabaseAdmin()

    // 1. 深度掃描 Storage 中的所有媒體檔案
    console.log('📁 開始深度掃描 Storage 檔案列表...')

    // 遞歸掃描函數（與診斷工具相同）
    async function scanDirectory(path: string = '', depth: number = 0): Promise<any[]> {
      if (depth > 3) return [] // 防止無限遞歸

      console.log(`📂 掃描路徑: ${path || '根目錄'} (深度: ${depth})`)

      const { data: items, error } = await supabase.storage
        .from('media')
        .list(path, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error(`❌ 掃描路徑 ${path} 失敗:`, error)
        return []
      }

      const allFiles: any[] = []

      for (const item of items || []) {
        const fullPath = path ? `${path}/${item.name}` : item.name

        if (item.id === null) {
          // 這是一個資料夾，遞歸掃描
          console.log(`📁 發現資料夾: ${fullPath}`)
          const subFiles = await scanDirectory(fullPath, depth + 1)
          allFiles.push(...subFiles)
        } else {
          // 這是一個檔案
          console.log(`📄 發現檔案: ${fullPath} (${((item.metadata?.size || 0) / 1024).toFixed(1)} KB)`)
          allFiles.push({
            ...item,
            fullPath,
            displayName: item.name,
            directory: path || '根目錄'
          })
        }
      }

      return allFiles
    }

    // 開始掃描
    const allFiles = await scanDirectory()

    if (!allFiles || allFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Storage 中沒有檔案需要清理',
        deleted_count: 0,
        total_files: 0
      })
    }

    console.log(`📊 掃描完成！總共找到 ${allFiles.length} 個檔案`)

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

    // 3. 智能分析使用中的檔案（與診斷工具相同邏輯）
    const usedFiles = new Set<string>()
    const usedPaths = new Set<string>()

    console.log('🔍 分析資料庫中的媒體使用情況...')

    questions?.forEach(question => {
      if (question.media_url || question.media_thumbnail_url) {
        // 處理 media_url
        if (question.media_url) {
          // 提取檔案名稱
          const fileName = question.media_url.split('/').pop()
          if (fileName) {
            usedFiles.add(fileName)
          }

          // 提取完整路徑（去除 Supabase URL 前綴）
          const urlParts = question.media_url.split('/storage/v1/object/public/media/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1]
            usedPaths.add(filePath)
            console.log(`🔗 使用中檔案路徑: ${filePath} (題目 ${question.id})`)
          }
        }

        // 處理 media_thumbnail_url
        if (question.media_thumbnail_url) {
          const fileName = question.media_thumbnail_url.split('/').pop()
          if (fileName) {
            usedFiles.add(fileName)
          }

          const urlParts = question.media_thumbnail_url.split('/storage/v1/object/public/media/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1]
            usedPaths.add(filePath)
            console.log(`🔗 使用中縮圖路徑: ${filePath} (題目 ${question.id})`)
          }
        }
      }
    })

    console.log(`📋 使用中檔案名稱: ${Array.from(usedFiles)}`)
    console.log(`📋 使用中檔案路徑: ${Array.from(usedPaths)}`)

    // 4. 智能匹配找出未使用的檔案
    console.log('🔍 開始智能檔案匹配...')

    const unusedFiles = allFiles.filter(file => {
      const fullPath = file.fullPath
      const fileName = file.displayName

      // 多種匹配方式
      const isUsedByPath = usedPaths.has(fullPath)
      const isUsedByName = usedFiles.has(fileName)

      // 檢查是否有部分路徑匹配
      const isUsedByPartialPath = Array.from(usedPaths).some(usedPath =>
        usedPath.includes(fileName) || fullPath.includes(usedPath)
      )

      const isUsed = isUsedByPath || isUsedByName || isUsedByPartialPath

      console.log(`📄 檔案 ${fullPath}: ${isUsed ? '使用中' : '未使用'}`)

      return !isUsed
    })

    console.log(`🗑️ 發現 ${unusedFiles.length} 個未使用的檔案`)

    if (unusedFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有檔案都在使用中，無需清理',
        deleted_count: 0,
        total_files: allFiles.length,
        used_files: allFiles.length // 全部檔案都在使用中
      })
    }

    // 5. 刪除未使用的檔案 - 使用完整路徑
    console.log('🗑️ 開始刪除未使用的檔案...')
    const filesToDelete = unusedFiles.map(file => file.fullPath)

    console.log('🗑️ 準備刪除的檔案路徑:', filesToDelete)

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

    // 6. 計算節省的空間
    const deletedFilesSizes = unusedFiles.map(file => ({
      name: file.displayName,
      full_path: file.fullPath,
      directory: file.directory,
      size: file.metadata?.size || 0,
      created_at: file.created_at
    }))

    const totalSizeSaved = deletedFilesSizes.reduce((sum, file) => sum + file.size, 0)

    return NextResponse.json({
      success: true,
      message: `成功清理 ${deleteResult?.length || 0} 個未使用的媒體檔案`,
      deleted_count: deleteResult?.length || 0,
      total_files: allFiles.length,
      used_files: allFiles.length - unusedFiles.length, // 實際在 Storage 中被使用的檔案數
      remaining_files: allFiles.length - (deleteResult?.length || 0),
      deleted_files: deletedFilesSizes,
      total_size_saved: totalSizeSaved,
      size_saved_mb: (totalSizeSaved / (1024 * 1024)).toFixed(2),
      size_saved_kb: (totalSizeSaved / 1024).toFixed(1),
      scan_summary: {
        total_scanned: allFiles.length,
        unused_found: unusedFiles.length,
        successfully_deleted: deleteResult?.length || 0
      }
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


    // 1. 深度掃描 Storage 中的所有媒體檔案（遞歸掃描）
    async function scanDirectory(path: string = '', depth: number = 0): Promise<any[]> {
      if (depth > 3) return [] // 防止無限遞歸

      const { data: items, error } = await supabase.storage
        .from('media')
        .list(path, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error(`掃描路徑 ${path} 失敗:`, error)
        return []
      }

      const allFiles: any[] = []

      for (const item of items || []) {
        const fullPath = path ? `${path}/${item.name}` : item.name

        if (item.id === null) {
          // 這是一個資料夾，遞歸掃描
          const subFiles = await scanDirectory(fullPath, depth + 1)
          allFiles.push(...subFiles)
        } else {
          // 這是一個檔案
          allFiles.push({
            ...item,
            fullPath
          })
        }
      }

      return allFiles
    }

    const files = await scanDirectory()


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

    // 3. 分析使用情況 - 使用完整路徑和檔名進行匹配
    const usedFiles = new Set<string>()
    const usedPaths = new Set<string>()
    const questionMediaMap: { [fileName: string]: any[] } = {}

    questions?.forEach(question => {
      if (question.media_url) {
        const fileName = question.media_url.split('/').pop()
        if (fileName) {
          usedFiles.add(fileName)
        }

        // 提取完整路徑
        const urlParts = question.media_url.split('/storage/v1/object/public/media/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          usedPaths.add(filePath)
        }

        if (fileName && !questionMediaMap[fileName]) {
          questionMediaMap[fileName] = []
        }
        if (fileName) {
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
        }

        // 提取完整路徑
        const urlParts = question.media_thumbnail_url.split('/storage/v1/object/public/media/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          usedPaths.add(filePath)
        }

        if (fileName && !questionMediaMap[fileName]) {
          questionMediaMap[fileName] = []
        }
        if (fileName) {
          questionMediaMap[fileName].push({
            id: question.id,
            question_text: question.question_text?.substring(0, 50) + '...',
            media_type: question.media_type,
            url_type: 'thumbnail'
          })
        }
      }
    })

    // 智能匹配：使用完整路徑或檔名
    const unusedFiles = files?.filter(file => {
      const fullPath = file.fullPath
      const fileName = file.name

      const isUsedByPath = usedPaths.has(fullPath)
      const isUsedByName = usedFiles.has(fileName)

      // 檢查部分路徑匹配
      const isUsedByPartialPath = Array.from(usedPaths).some(usedPath =>
        usedPath.includes(fileName) || fullPath.includes(usedPath)
      )

      return !(isUsedByPath || isUsedByName || isUsedByPartialPath)
    }) || []
    const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
    const unusedSize = unusedFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)

    return NextResponse.json({
      success: true,
      analysis: {
        total_files: files?.length || 0,
        used_files: (files?.length || 0) - unusedFiles.length, // 實際在 Storage 中被使用的檔案數
        unused_files: unusedFiles.length,
        total_size_bytes: totalSize,
        unused_size_bytes: unusedSize,
        total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
        unused_size_mb: (unusedSize / (1024 * 1024)).toFixed(2),
        space_utilization: files?.length ? (((files.length - unusedFiles.length) / files.length) * 100).toFixed(1) : '0'
      },
      unused_files: unusedFiles.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        size_mb: ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
        created_at: file.created_at || new Date().toISOString(),
        last_modified: file.updated_at || file.created_at || new Date().toISOString()
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
