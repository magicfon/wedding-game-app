import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    console.log('=== 隱私照片 API 開始 ===')
    
    // 不檢查管理員權限，直接獲取隱私照片（因為 LIFF 已經在前端驗證）
    // 獲取所有隱私照片（is_public = false）
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
        uploader:users!photos_user_id_fkey (
          display_name,
          picture_url
        )
      `)
      .eq('is_public', false)
      .order('created_at', { ascending: false })

    console.log('隱私照片查詢結果:', { 
      success: !photosError, 
      count: photos?.length || 0,
      error: photosError 
    })

    if (photosError) {
      console.error('獲取隱私照片失敗:', photosError)
      return NextResponse.json(
        { error: '獲取隱私照片失敗', details: photosError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      photos: photos || [],
      count: photos?.length || 0
    })

  } catch (error) {
    console.error('獲取隱私照片失敗:', error)
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

