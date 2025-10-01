import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // 檢查管理員權限
    const cookieStore = await cookies()
    const lineUserId = cookieStore.get('line_user_id')?.value

    if (!lineUserId) {
      return NextResponse.json(
        { error: '未登入' },
        { status: 401 }
      )
    }

    // 檢查是否為管理員
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('line_user_id')
      .eq('line_user_id', lineUserId)
      .single()

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: '無管理員權限' },
        { status: 403 }
      )
    }

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

