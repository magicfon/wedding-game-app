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

    // 儲存照片資訊到資料庫
    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert({
        uploader_line_id: uploaderLineId,
        google_drive_file_id: uploadData.path,
        file_name: fileName,
        blessing_message: blessingMessage || '',
        is_public: isPublic,
        vote_count: 0
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ 資料庫儲存失敗:', dbError)
      
      // 如果資料庫儲存失敗，嘗試刪除已上傳的檔案
      await supabase.storage
        .from('wedding-photos')
        .remove([fileName])
        
      return NextResponse.json({ 
        error: '照片資訊儲存失敗',
        details: dbError.message 
      }, { status: 500 })
    }

    console.log(`✅ 照片上傳成功: ${fileName}`)

    return NextResponse.json({
      success: true,
      message: '照片上傳成功',
      data: {
        id: photoData.id,
        fileName,
        publicUrl: urlData.publicUrl,
        blessingMessage,
        isPublic,
        uploadTime: photoData.upload_time
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
