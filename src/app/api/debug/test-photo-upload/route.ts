import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { uploaderLineId } = await request.json()

    console.log('🧪 測試照片上傳流程，用戶 ID:', uploaderLineId)

    // 1. 檢查用戶是否存在
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('line_id', uploaderLineId)
      .single()

    console.log('👤 用戶查詢結果:', { existingUser, userCheckError })

    let userCreated = false
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // 用戶不存在，創建用戶記錄
      console.log('📝 用戶不存在，準備創建...')
      
      const { data: newUser, error: userCreateError } = await supabase
        .from('users')
        .insert({
          line_id: uploaderLineId,
          display_name: 'Test User',
          total_score: 0,
          is_active: true
        })
        .select()
        .single()

      if (userCreateError) {
        console.error('❌ 創建用戶失敗:', userCreateError)
        return NextResponse.json({
          success: false,
          step: 'create_user',
          error: userCreateError.message,
          details: userCreateError
        }, { status: 500 })
      }

      console.log('✅ 用戶創建成功:', newUser)
      userCreated = true
    }

    // 2. 檢查 photos 表格結構
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .limit(1)

    console.log('📊 Photos 表格查詢:', { photos, photosError })

    // 3. 嘗試插入測試照片記錄
    const testPhotoData: any = {
      uploader_line_id: uploaderLineId,
      file_name: `test_${Date.now()}.jpg`,
      blessing_message: '測試祝福訊息',
      is_public: true,
      vote_count: 0
    }

    // 可選欄位
    testPhotoData.google_drive_file_id = 'test_path'

    console.log('📸 準備插入測試照片:', testPhotoData)

    const { data: photoData, error: photoError } = await supabase
      .from('photos')
      .insert(testPhotoData)
      .select()
      .single()

    if (photoError) {
      console.error('❌ 插入照片失敗:', photoError)
      return NextResponse.json({
        success: false,
        step: 'insert_photo',
        error: photoError.message,
        details: photoError,
        userCreated,
        testData: testPhotoData
      }, { status: 500 })
    }

    console.log('✅ 照片記錄插入成功:', photoData)

    // 4. 清理測試資料
    if (photoData) {
      await supabase
        .from('photos')
        .delete()
        .eq('id', photoData.id)
      
      console.log('🧹 測試資料已清理')
    }

    if (userCreated) {
      await supabase
        .from('users')
        .delete()
        .eq('line_id', uploaderLineId)
      
      console.log('🧹 測試用戶已清理')
    }

    return NextResponse.json({
      success: true,
      message: '照片上傳流程測試成功',
      details: {
        userExists: !userCreated,
        userCreated,
        photoInserted: true,
        photoData: photoData
      }
    })

  } catch (error) {
    console.error('❌ 測試失敗:', error)
    return NextResponse.json({
      success: false,
      step: 'unknown',
      error: error instanceof Error ? error.message : '未知錯誤',
      details: error
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '請使用 POST 請求測試照片上傳流程',
    usage: {
      method: 'POST',
      body: {
        uploaderLineId: 'your_line_user_id'
      }
    }
  })
}
