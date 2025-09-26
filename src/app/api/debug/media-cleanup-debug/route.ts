import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 開始診斷媒體清理問題...')
    
    const supabase = createSupabaseAdmin()
    
    // 1. 檢查 Storage 中的檔案
    console.log('📁 檢查 Storage 檔案...')
    const { data: files, error: filesError } = await supabase.storage
      .from('media')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      console.error('❌ 獲取檔案列表失敗:', filesError)
      return NextResponse.json({
        error: '無法獲取檔案列表',
        details: filesError.message,
        step: 'list_files'
      }, { status: 500 })
    }

    console.log(`📊 Storage 中共有 ${files?.length || 0} 個檔案`)

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

    // 3. 分析媒體使用情況
    const usedFiles = new Set<string>()
    const mediaQuestions: any[] = []
    
    questions?.forEach(question => {
      if (question.media_url || question.media_thumbnail_url) {
        mediaQuestions.push({
          id: question.id,
          question_text: question.question_text?.substring(0, 50) + '...',
          media_type: question.media_type,
          media_url: question.media_url,
          media_thumbnail_url: question.media_thumbnail_url
        })
        
        if (question.media_url) {
          const fileName = question.media_url.split('/').pop()
          if (fileName) {
            usedFiles.add(fileName)
            console.log(`🔗 使用中檔案: ${fileName} (來自題目 ${question.id})`)
          }
        }
        
        if (question.media_thumbnail_url) {
          const fileName = question.media_thumbnail_url.split('/').pop()
          if (fileName) {
            usedFiles.add(fileName)
            console.log(`🔗 使用中縮圖: ${fileName} (來自題目 ${question.id})`)
          }
        }
      }
    })

    // 4. 找出未使用的檔案
    const unusedFiles = files?.filter(file => !usedFiles.has(file.name)) || []
    const storageFileDetails = files?.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      size_mb: ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
      created_at: file.created_at,
      is_used: usedFiles.has(file.name)
    })) || []

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
        storage_files: {
          total: files?.length || 0,
          details: storageFileDetails
        },
        database_questions: {
          total: questions?.length || 0,
          with_media: mediaQuestions.length,
          media_questions: mediaQuestions
        },
        file_analysis: {
          used_files: Array.from(usedFiles),
          unused_files: unusedFiles.map(f => ({
            name: f.name,
            size_mb: ((f.metadata?.size || 0) / (1024 * 1024)).toFixed(2),
            created_at: f.created_at
          })),
          used_count: usedFiles.size,
          unused_count: unusedFiles.length
        },
        permissions: {
          service_role_key_exists: serviceRoleKeyExists,
          service_role_key_prefix: serviceRoleKeyExists ? serviceRoleKeyPrefix : 'NOT_SET',
          delete_permission_test: deletePermissionTest
        },
        next_steps: unusedFiles.length === 0 
          ? ['所有檔案都在使用中，無需清理']
          : [
              `發現 ${unusedFiles.length} 個未使用檔案可以清理`,
              '檢查 Service Role Key 是否有 Storage 刪除權限',
              '確認 Supabase Storage 的 RLS 政策設定'
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
