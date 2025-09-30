import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const blessingMessage = formData.get('blessingMessage') as string
    const isPublic = formData.get('isPublic') === 'true'
    const uploaderLineId = formData.get('uploaderLineId') as string
    
    if (!file) {
      return NextResponse.json({ 
        error: '未選擇檔案' 
      }, { status: 400 })
    }

    if (!uploaderLineId) {
      return NextResponse.json({ 
        error: '用戶身份驗證失敗' 
      }, { status: 401 })
    }

    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: '請選擇圖片檔案' 
      }, { status: 400 })
    }

    // 檢查檔案大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: '圖片檔案不能超過 5MB' 
      }, { status: 400 })
    }

    // 生成唯一檔案名
    const fileExt = file.name.split('.').pop()
    const fileName = `${uploaderLineId}_${Date.now()}.${fileExt}`

    console.log(`📸 開始上傳照片: ${fileName}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

    // 上傳到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wedding-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ 照片上傳失敗:', uploadError)
      return NextResponse.json({ 
        error: '照片上傳失敗',
        details: uploadError.message 
      }, { status: 500 })
    }

    // 獲取公開URL
    const { data: urlData } = supabase.storage
      .from('wedding-photos')
      .getPublicUrl(fileName)

    // 先確保用戶存在於 users 表格中
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('line_id')
      .eq('line_id', uploaderLineId)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // 用戶不存在，創建用戶記錄
      console.log('📝 用戶不存在，準備創建用戶:', uploaderLineId)
      
      const { data: newUser, error: userCreateError } = await supabase
        .from('users')
        .insert({
          line_id: uploaderLineId,
          display_name: 'Unknown User', // 臨時名稱，之後會被 LIFF sync 更新
          total_score: 0,
          is_active: true
        })
        .select()
        .single()

      if (userCreateError) {
        console.error('❌ 創建用戶失敗:', userCreateError)
        console.error('完整錯誤:', JSON.stringify(userCreateError, null, 2))
        return NextResponse.json({ 
          error: '用戶創建失敗',
          details: userCreateError.message,
          code: userCreateError.code,
          hint: userCreateError.hint
        }, { status: 500 })
      }
      
      console.log('✅ 用戶創建成功:', newUser)
    } else if (userCheckError) {
      console.error('❌ 檢查用戶時發生錯誤:', userCheckError)
      return NextResponse.json({ 
        error: '檢查用戶失敗',
        details: userCheckError.message 
      }, { status: 500 })
    }

    // 儲存照片資訊到資料庫
    // 注意: 實際的資料庫結構使用 image_url 和 user_id，而非 file_name 和 uploader_line_id
    const photoInsertData: any = {
      user_id: uploaderLineId,  // 對應 users.line_id
      image_url: urlData.publicUrl,  // 使用公開 URL
      blessing_message: blessingMessage || '',
      is_public: isPublic,
      vote_count: 0
    }

    console.log('📸 準備插入資料庫:', photoInsertData)

    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert(photoInsertData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ 資料庫儲存失敗:', dbError)
      console.error('完整錯誤:', JSON.stringify(dbError, null, 2))
      console.error('嘗試插入的資料:', JSON.stringify(photoInsertData, null, 2))
      
      // 如果資料庫儲存失敗，嘗試刪除已上傳的檔案
      await supabase.storage
        .from('wedding-photos')
        .remove([fileName])
        
      return NextResponse.json({ 
        error: '照片資訊儲存失敗',
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint,
        fullError: dbError
      }, { status: 500 })
    }

    console.log(`✅ 照片上傳成功: ${fileName}`)

    return NextResponse.json({
      success: true,
      message: '照片上傳成功',
      data: {
        id: photoData.id,
        fileName,
        publicUrl: urlData?.publicUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wedding-photos/${fileName}`,
        blessingMessage,
        isPublic,
        uploadTime: photoData.created_at || new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ 照片上傳錯誤:', error)
    return NextResponse.json({ 
      error: '照片上傳失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
