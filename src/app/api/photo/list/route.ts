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
    // 注意: 實際資料庫使用 user_id 而非 uploader_line_id
    let query = supabase
      .from('photos')
      .select(`
        *,
        uploader:users!photos_user_id_fkey(display_name, avatar_url)
      `)
    
    // 如果只要公開照片
    if (isPublic) {
      query = query.eq('is_public', true)
    }
    
    // 排序
    // 注意: 實際資料庫使用 created_at 而非 upload_time
    if (sortBy === 'votes') {
      query = query.order('vote_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
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

    // 照片已經包含 image_url，不需要額外處理
    const photosWithUrls = photos || []

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
