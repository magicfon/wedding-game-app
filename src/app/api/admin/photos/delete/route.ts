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

    // 檢查照片是否有投票記錄 (votes 表)
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('id')
      .eq('photo_id', photoId)
      .limit(1)

    if (!votesError && votes && votes.length > 0) {
      console.log('照片在 votes 表有投票記錄，無法直接刪除')
      return NextResponse.json(
        {
          error: '此照片有投票記錄，無法刪除',
          details: '請先使用「重置投票」功能清除所有投票記錄後再刪除照片',
          hasVotes: true
        },
        { status: 400 }
      )
    }

    // 檢查 photo_votes 表（如果存在）
    const { data: photoVotes, error: photoVotesError } = await supabaseAdmin
      .from('photo_votes')
      .select('id')
      .eq('photo_id', photoId)
      .limit(1)

    if (!photoVotesError && photoVotes && photoVotes.length > 0) {
      console.log('照片在 photo_votes 表有投票記錄，無法直接刪除')
      return NextResponse.json(
        {
          error: '此照片有投票記錄（photo_votes），無法刪除',
          details: '請先使用「重置投票」功能清除所有投票記錄後再刪除照片',
          hasVotes: true
        },
        { status: 400 }
      )
    }

    // 先刪除 photo_thumbnail_migration 表中的相關記錄（如果有）
    const { error: thumbnailMigrationError } = await supabaseAdmin
      .from('photo_thumbnail_migration')
      .delete()
      .eq('photo_id', photoId)

    if (thumbnailMigrationError) {
      // 如果表不存在或其他非致命錯誤，只記錄警告
      console.warn('刪除 photo_thumbnail_migration 記錄時警告:', thumbnailMigrationError)
    } else {
      console.log('已刪除 photo_thumbnail_migration 相關記錄')
    }

    // 從數據庫刪除照片記錄
    const { error: deleteError } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('刪除照片記錄失敗:', deleteError)
      console.error('錯誤詳情:', JSON.stringify(deleteError))

      // 檢查是否為外鍵約束錯誤
      if (deleteError.message.includes('violates foreign key constraint')) {
        // 嘗試辨識是哪個表格的約束
        let constraintSource = '關聯資料'
        if (deleteError.message.includes('votes')) {
          constraintSource = '投票記錄'
        } else if (deleteError.message.includes('lottery')) {
          constraintSource = '抽獎歷史記錄'
        } else if (deleteError.message.includes('photo_votes')) {
          constraintSource = 'photo_votes 投票記錄'
        }

        return NextResponse.json(
          {
            error: `此照片有${constraintSource}關聯，無法刪除`,
            details: deleteError.message,
            hasConstraint: true
          },
          { status: 400 }
        )
      }
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

