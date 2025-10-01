import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    console.log('=== 刪除照片 API 開始 ===')
    
    // 獲取請求數據
    const { photoId } = await request.json()

    if (!photoId) {
      return NextResponse.json(
        { error: '缺少照片 ID' },
        { status: 400 }
      )
    }

    console.log('準備刪除照片 ID:', photoId)

    // 先獲取照片資訊（用於刪除 Storage 中的文件）
    const { data: photo, error: fetchError } = await supabaseAdmin
      .from('photos')
      .select('image_url')
      .eq('id', photoId)
      .single()

    if (fetchError || !photo) {
      console.error('獲取照片資訊失敗:', fetchError)
      return NextResponse.json(
        { error: '照片不存在' },
        { status: 404 }
      )
    }

    console.log('照片 URL:', photo.image_url)

    // 從數據庫刪除照片記錄
    const { error: deleteError } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('刪除照片記錄失敗:', deleteError)
      return NextResponse.json(
        { error: '刪除失敗', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('照片記錄已從數據庫刪除')

    // 嘗試從 Storage 刪除文件（如果失敗也不影響整體結果）
    try {
      // 從 URL 提取文件路徑
      // URL 格式: https://.../storage/v1/object/public/wedding-photos/xxx.jpg
      const urlParts = photo.image_url.split('/wedding-photos/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        console.log('嘗試刪除 Storage 文件:', filePath)
        
        const { error: storageError } = await supabaseAdmin
          .storage
          .from('wedding-photos')
          .remove([filePath])

        if (storageError) {
          console.warn('Storage 文件刪除失敗（不影響結果）:', storageError)
        } else {
          console.log('Storage 文件已刪除')
        }
      }
    } catch (storageErr) {
      console.warn('Storage 清理錯誤（不影響結果）:', storageErr)
    }

    return NextResponse.json({
      success: true,
      message: '照片已刪除'
    })

  } catch (error) {
    console.error('刪除照片失敗:', error)
    return NextResponse.json(
      { error: '伺服器錯誤', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

