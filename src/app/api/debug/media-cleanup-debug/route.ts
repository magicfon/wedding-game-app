import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 開始診斷媒體清理問題...')
    
    const supabase = createSupabaseAdmin()
    
    // 1. 深度掃描 Supabase Storage 'media' bucket
    console.log('📁 開始深度掃描 Supabase Storage media bucket...')
    
    // 遞歸掃描函數
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
    const allFoundFiles = await scanDirectory()
    
    console.log(`📊 掃描完成！總共找到 ${allFoundFiles.length} 個檔案`)
    
    // 按目錄分組顯示
    const filesByDirectory = allFoundFiles.reduce((acc: any, file) => {
      const dir = file.directory || '根目錄'
      if (!acc[dir]) acc[dir] = []
      acc[dir].push(file)
      return acc
    }, {})
    
    console.log('📁 按目錄分組的檔案:')
    Object.entries(filesByDirectory).forEach(([dir, files]: [string, any]) => {
      console.log(`  ${dir}: ${files.length} 個檔案`)
      files.forEach((file: any) => {
        console.log(`    - ${file.displayName} (${file.fullPath})`)
      })
    })

    // 2. 檢查資料庫中的媒體URL
    console.log('🔍 檢查資料庫媒體記錄...')
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, media_url, media_thumbnail_url, media_type')

    if (questionsError) {
      console.error('❌ 獲取題目失敗:', questionsError)
      return NextResponse.json({
        error: '無法獲取題目',
        details: questionsError.message,
        step: 'get_questions'
      }, { status: 500 })
    }

    console.log(`📋 資料庫中共有 ${questions?.length || 0} 個題目`)

    // 3. 分析媒體使用情況 - 改進檔案匹配邏輯
    const usedFiles = new Set<string>()
    const usedPaths = new Set<string>()
    const mediaQuestions: any[] = []
    
    console.log('🔍 分析資料庫中的媒體使用情況...')
    
    questions?.forEach(question => {
      if (question.media_url || question.media_thumbnail_url) {
        mediaQuestions.push({
          id: question.id,
          question_text: question.question_text?.substring(0, 50) + '...',
          media_type: question.media_type,
          media_url: question.media_url,
          media_thumbnail_url: question.media_thumbnail_url
        })
        
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
    
    console.log(`📋 使用媒體的題目: ${mediaQuestions.length} 個`)
    console.log(`🔗 使用中檔案名稱: ${Array.from(usedFiles)}`)
    console.log(`🔗 使用中檔案路徑: ${Array.from(usedPaths)}`)

    // 4. 智能檔案匹配 - 找出未使用的檔案
    console.log('🔍 開始智能檔案匹配...')
    
    const unusedFiles = allFoundFiles.filter(file => {
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
      
      console.log(`📄 檔案 ${fullPath}:`)
      console.log(`  - 完整路徑匹配: ${isUsedByPath}`)
      console.log(`  - 檔案名稱匹配: ${isUsedByName}`)
      console.log(`  - 部分路徑匹配: ${isUsedByPartialPath}`)
      console.log(`  - 最終結果: ${isUsed ? '使用中' : '未使用'}`)
      
      return !isUsed
    })
    
    const storageFileDetails = allFoundFiles.map(file => {
      const fullPath = file.fullPath
      const fileName = file.displayName
      const isUsedByPath = usedPaths.has(fullPath)
      const isUsedByName = usedFiles.has(fileName)
      const isUsed = isUsedByPath || isUsedByName || Array.from(usedPaths).some(usedPath => 
        usedPath.includes(fileName) || fullPath.includes(usedPath)
      )
      
      return {
        name: fileName,
        full_path: fullPath,
        directory: file.directory,
        size: file.metadata?.size || 0,
        size_mb: ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
        size_kb: ((file.metadata?.size || 0) / 1024).toFixed(1),
        created_at: file.created_at,
        is_used: isUsed,
        match_type: isUsedByPath ? 'path' : isUsedByName ? 'name' : 'none'
      }
    })

    console.log(`🗑️ 發現 ${unusedFiles.length} 個未使用的檔案`)

    // 5. 測試刪除權限（不實際刪除）
    let deletePermissionTest = null
    if (unusedFiles.length > 0) {
      // 嘗試獲取第一個檔案的公共URL來測試權限
      const testFile = unusedFiles[0]
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(testFile.name)
      
      deletePermissionTest = {
        test_file: testFile.name,
        public_url: urlData.publicUrl,
        can_access: !!urlData.publicUrl
      }
      
      console.log('🔐 權限測試:', deletePermissionTest)
    }

    // 6. 檢查 Service Role Key
    const serviceRoleKeyExists = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceRoleKeyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'

    return NextResponse.json({
      success: true,
      diagnosis: {
        storage_scan: {
          total_files: allFoundFiles.length,
          files_by_directory: filesByDirectory,
          all_files: storageFileDetails
        },
        database_analysis: {
          total_questions: questions?.length || 0,
          media_questions_count: mediaQuestions.length,
          media_questions: mediaQuestions,
          used_file_names: Array.from(usedFiles),
          used_file_paths: Array.from(usedPaths)
        },
        matching_analysis: {
          total_storage_files: allFoundFiles.length,
          used_files_count: allFoundFiles.length - unusedFiles.length,
          unused_files_count: unusedFiles.length,
          unused_files: unusedFiles.map(f => ({
            name: f.displayName,
            full_path: f.fullPath,
            directory: f.directory,
            size_kb: ((f.metadata?.size || 0) / 1024).toFixed(1),
            size_mb: ((f.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
            created_at: f.created_at
          })),
          file_details: storageFileDetails
        },
        system_info: {
          service_role_key_exists: serviceRoleKeyExists,
          service_role_key_prefix: serviceRoleKeyExists ? serviceRoleKeyPrefix : 'NOT_SET',
          delete_permission_test: deletePermissionTest
        },
        summary: {
          expected_files: 7,
          found_files: allFoundFiles.length,
          files_match_expected: allFoundFiles.length >= 7,
          can_cleanup: unusedFiles.length > 0,
          directories_scanned: Object.keys(filesByDirectory).length
        },
        recommendations: allFoundFiles.length === 0
          ? [
              '❌ 沒有找到任何檔案',
              '檢查 Supabase Storage bucket 是否存在',
              '確認 Service Role Key 權限',
              '檢查 bucket 名稱是否正確 (media)'
            ]
          : allFoundFiles.length < 7
          ? [
              `⚠️ 預期 7 個檔案，實際找到 ${allFoundFiles.length} 個`,
              '可能有檔案在未掃描的目錄中',
              '或者有檔案已被刪除',
              '檢查上傳歷史記錄'
            ]
          : unusedFiles.length === 0 
          ? [
              '✅ 所有檔案都在使用中',
              '無需清理任何檔案',
              '媒體管理狀況良好'
            ]
          : [
              `🗑️ 可以清理 ${unusedFiles.length} 個未使用檔案`,
              `💾 可節省約 ${unusedFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0) / (1024 * 1024)} MB 空間`,
              '確認清理列表後可執行清理操作'
            ]
      }
    })

  } catch (error) {
    console.error('❌ 診斷錯誤:', error)
    return NextResponse.json({
      error: '診斷過程中發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { test_delete = false, file_name } = body
    
    console.log('🧪 測試刪除功能...')
    
    const supabase = createSupabaseAdmin()
    
    if (!test_delete || !file_name) {
      return NextResponse.json({
        error: '請提供 test_delete: true 和 file_name 參數'
      }, { status: 400 })
    }
    
    console.log(`🗑️ 嘗試刪除測試檔案: ${file_name}`)
    
    const { data: deleteResult, error: deleteError } = await supabase.storage
      .from('media')
      .remove([file_name])

    if (deleteError) {
      console.error('❌ 刪除測試失敗:', deleteError)
      return NextResponse.json({
        success: false,
        error: '刪除測試失敗',
        details: deleteError.message,
        error_info: deleteError
      })
    }

    console.log('✅ 刪除測試成功:', deleteResult)

    return NextResponse.json({
      success: true,
      message: '刪除測試成功',
      deleted_files: deleteResult,
      test_file: file_name
    })

  } catch (error) {
    console.error('❌ 測試刪除錯誤:', error)
    return NextResponse.json({
      error: '測試刪除時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
