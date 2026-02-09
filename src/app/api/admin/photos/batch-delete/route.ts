import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(request: NextRequest) {
  console.log('=== 批量刪除照片 API 開始 ===')

  try {
    // 檢查環境變數
    console.log('環境變數檢查:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    const supabaseAdmin = createSupabaseAdmin()
    console.log('Supabase Admin 建立成功')

    // 獲取請求數據
    let body
    try {
      body = await request.json()
      console.log('請求 body:', JSON.stringify(body))
    } catch (parseError) {
      console.error('解析請求 body 失敗:', parseError)
      return NextResponse.json(
        { error: '無效的請求格式', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      )
    }

    const { photoIds } = body

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: '缺少照片 ID 陣列' },
        { status: 400 }
      )
    }

    console.log('準備批量刪除照片 IDs:', photoIds)

    // 先獲取所有照片資訊（用於刪除 Storage 中的文件）
    const { data: photos, error: fetchError } = await supabaseAdmin
      .from('photos')
      .select('id, image_url')
      .in('id', photoIds)

    if (fetchError) {
      console.error('獲取照片資訊失敗:', fetchError)
      return NextResponse.json(
        { error: '獲取照片資訊失敗', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: '找不到指定的照片' },
        { status: 404 }
      )
    }

    console.log('找到照片數量:', photos.length)

    // 檢查是否有照片存在投票記錄
    const { data: votedPhotos, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('photo_id')
      .in('photo_id', photoIds)

    if (!votesError && votedPhotos && votedPhotos.length > 0) {
      // 找出有投票的照片數量
      const uniqueVotedPhotoIds = [...new Set(votedPhotos.map(v => v.photo_id))]
      console.log('有投票記錄的照片:', uniqueVotedPhotoIds)
      return NextResponse.json(
        {
          error: `選中的照片中有 ${uniqueVotedPhotoIds.length} 張有投票記錄，無法刪除`,
          details: '請先使用「重置投票」功能清除所有投票記錄後再刪除照片',
          hasVotes: true,
          votedPhotoIds: uniqueVotedPhotoIds
        },
        { status: 400 }
      )
    }

    // 先刪除 photo_thumbnail_migration 表中的相關記錄（如果有）
    const { error: thumbnailMigrationError } = await supabaseAdmin
      .from('photo_thumbnail_migration')
      .delete()
      .in('photo_id', photoIds)

    if (thumbnailMigrationError) {
      // 如果表不存在或其他非致命錯誤，只記錄警告
      console.warn('刪除 photo_thumbnail_migration 記錄時警告:', thumbnailMigrationError)
    } else {
      console.log('已刪除 photo_thumbnail_migration 相關記錄')
    }

    // 從數據庫批量刪除照片記錄
    const { error: deleteError } = await supabaseAdmin
      .from('photos')
      .delete()
      .in('id', photoIds)

    if (deleteError) {
      console.error('批量刪除照片記錄失敗:', deleteError)
      // 檢查是否為外鍵約束錯誤
      if (deleteError.message.includes('violates foreign key constraint')) {
        return NextResponse.json(
          {
            error: '部分照片有關聯的投票記錄，無法刪除',
            details: '請先使用「重置投票」功能清除所有投票記錄後再刪除照片',
            hasVotes: true
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: '批量刪除失敗', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('照片記錄已從數據庫批量刪除')

    // 嘗試從 Storage 批量刪除文件（如果失敗也不影響整體結果）
    const storageResults = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    try {
      const filePaths: string[] = []

      // 從 URL 提取文件路徑
      photos.forEach(photo => {
        // URL 格式: https://.../storage/v1/object/public/wedding-photos/xxx.jpg
        const urlParts = photo.image_url.split('/wedding-photos/')
        if (urlParts.length > 1) {
          filePaths.push(urlParts[1])
        }
      })

      if (filePaths.length > 0) {
        console.log('嘗試批量刪除 Storage 文件:', filePaths)

        const { error: storageError } = await supabaseAdmin
          .storage
          .from('wedding-photos')
          .remove(filePaths)

        if (storageError) {
          console.warn('Storage 批量文件刪除失敗（不影響結果）:', storageError)
          storageResults.failed = filePaths.length
          storageResults.errors.push(storageError.message)
        } else {
          console.log('Storage 文件已批量刪除')
          storageResults.success = filePaths.length
        }
      }
    } catch (storageErr) {
      console.warn('Storage 批量清理錯誤（不影響結果）:', storageErr)
      storageResults.failed = photos.length
      storageResults.errors.push(storageErr instanceof Error ? storageErr.message : String(storageErr))
    }

    return NextResponse.json({
      success: true,
      message: `已成功刪除 ${photos.length} 張照片`,
      deletedCount: photos.length,
      storageResults
    })

  } catch (error) {
    console.error('批量刪除照片失敗:', error)
    return NextResponse.json(
      { error: '伺服器錯誤', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}