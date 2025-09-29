import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    const sortBy = searchParams.get('sortBy') || 'votes' // votes | time
    const isPublic = searchParams.get('isPublic') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    
    console.log(`📸 獲取照片列表，排序：${sortBy}，公開：${isPublic}，限制：${limit || '無'}`)

    // 構建查詢
    let query = supabase
      .from('photos')
      .select(`
        *,
        uploader:users!photos_uploader_line_id_fkey(display_name, avatar_url)
      `)
    
    // 如果只要公開照片
    if (isPublic) {
      query = query.eq('is_public', true)
    }
    
    // 排序
    if (sortBy === 'votes') {
      query = query.order('vote_count', { ascending: false })
    } else {
      query = query.order('upload_time', { ascending: false })
    }
    
    // 限制數量
    if (limit) {
      query = query.limit(limit)
    }

    const { data: photos, error } = await query

    if (error) {
      console.error('❌ 獲取照片列表失敗:', error)
      return NextResponse.json({ 
        error: '獲取照片列表失敗',
        details: error.message 
      }, { status: 500 })
    }

    // 為每張照片添加完整的圖片 URL
    const photosWithUrls = photos?.map(photo => ({
      ...photo,
      imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wedding-photos/${photo.google_drive_file_id}`
    })) || []

    console.log(`✅ 成功獲取 ${photosWithUrls.length} 張照片`)

    return NextResponse.json({
      success: true,
      data: {
        photos: photosWithUrls,
        total: photosWithUrls.length,
        sortBy,
        isPublic
      }
    })

  } catch (error) {
    console.error('❌ 照片列表 API 錯誤:', error)
    return NextResponse.json({ 
      error: '獲取照片列表失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
