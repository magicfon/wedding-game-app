import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const mediaType = formData.get('mediaType') as string
    const altText = formData.get('altText') as string
    
    if (!file) {
      return NextResponse.json({ 
        error: '未選擇檔案' 
      }, { status: 400 })
    }

    // 檢查檔案類型
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    
    if (mediaType === 'image' && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: '不支援的圖片格式。支援格式：JPEG, PNG, GIF, WebP' 
      }, { status: 400 })
    }
    
    if (mediaType === 'video' && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: '不支援的影片格式。支援格式：MP4, WebM, OGG' 
      }, { status: 400 })
    }

    // 檢查檔案大小
    const maxImageSize = 5 * 1024 * 1024 // 5MB
    const maxVideoSize = 50 * 1024 * 1024 // 50MB
    
    if (mediaType === 'image' && file.size > maxImageSize) {
      return NextResponse.json({ 
        error: '圖片檔案過大，最大支援 5MB' 
      }, { status: 400 })
    }
    
    if (mediaType === 'video' && file.size > maxVideoSize) {
      return NextResponse.json({ 
        error: '影片檔案過大，最大支援 50MB' 
      }, { status: 400 })
    }

    // 生成唯一檔名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `${mediaType}_${timestamp}_${randomStr}.${extension}`
    const filePath = `questions/${fileName}`

    console.log(`📤 開始上傳檔案: ${fileName}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

    // 上傳到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ 上傳失敗:', uploadError)
      return NextResponse.json({ 
        error: '檔案上傳失敗',
        details: uploadError.message 
      }, { status: 500 })
    }

    // 獲取公開URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    console.log(`✅ 上傳成功: ${publicUrl}`)

    // 如果是影片，嘗試生成縮圖（這裡先返回預設縮圖）
    let thumbnailUrl = null
    if (mediaType === 'video') {
      // 在實際應用中，這裡可以使用影片處理服務生成縮圖
      // 現在先使用預設的影片圖示
      thumbnailUrl = '/icons/video-placeholder.png'
    }

    return NextResponse.json({
      success: true,
      message: '檔案上傳成功',
      data: {
        fileName,
        filePath,
        publicUrl,
        thumbnailUrl,
        mediaType,
        fileSize: file.size,
        altText: altText || `${mediaType === 'image' ? '圖片' : '影片'}內容`
      }
    })

  } catch (error) {
    console.error('❌ 媒體上傳錯誤:', error)
    return NextResponse.json({ 
      error: '上傳失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('filePath')
    
    if (!filePath) {
      return NextResponse.json({ 
        error: '缺少檔案路徑' 
      }, { status: 400 })
    }

    console.log(`🗑️ 刪除檔案: ${filePath}`)

    // 從 Supabase Storage 刪除檔案
    const { error: deleteError } = await supabase.storage
      .from('media')
      .remove([filePath])

    if (deleteError) {
      console.error('❌ 刪除失敗:', deleteError)
      return NextResponse.json({ 
        error: '檔案刪除失敗',
        details: deleteError.message 
      }, { status: 500 })
    }

    console.log(`✅ 檔案刪除成功: ${filePath}`)

    return NextResponse.json({
      success: true,
      message: '檔案刪除成功'
    })

  } catch (error) {
    console.error('❌ 媒體刪除錯誤:', error)
    return NextResponse.json({ 
      error: '刪除失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
