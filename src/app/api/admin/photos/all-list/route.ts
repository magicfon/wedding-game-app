import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    console.log('=== 所有照片 API 開始 ===')

    // 獲取所有照片（公開和隱私）
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select(`
        id,
        image_url,
        blessing_message,
        is_public,
        vote_count,
        created_at,
        user_id,
        file_size,
        uploader:users!photos_user_id_fkey (
          display_name,
          avatar_url
        ),
        thumbnail_small_url,
        thumbnail_medium_url,
        thumbnail_large_url,
        media_type
      `)
      .order('created_at', { ascending: false })

    console.log('所有照片查詢結果:', {
      success: !photosError,
      count: photos?.length || 0,
      error: photosError
    })

    if (photosError) {
      console.error('獲取照片失敗:', photosError)
      return NextResponse.json(
        { error: '獲取照片失敗', details: photosError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      photos: photos || [],
      count: photos?.length || 0
    })

  } catch (error) {
    console.error('獲取照片失敗:', error)
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

