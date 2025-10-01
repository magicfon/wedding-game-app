import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 不檢查管理員權限，直接執行操作（因為 LIFF 已經在前端驗證）
    // 獲取請求數據
    const { photoId, isPublic } = await request.json()

    if (!photoId) {
      return NextResponse.json(
        { error: '缺少照片 ID' },
        { status: 400 }
      )
    }

    // 更新照片的公開狀態
    const { data, error } = await supabaseAdmin
      .from('photos')
      .update({ is_public: isPublic })
      .eq('id', photoId)
      .select()
      .single()

    if (error) {
      console.error('更新照片可見性失敗:', error)
      return NextResponse.json(
        { error: '更新失敗', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      photo: data,
      message: `照片已${isPublic ? '公開' : '設為隱私'}`
    })

  } catch (error) {
    console.error('切換照片可見性失敗:', error)
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

