import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取 photo-wall 照片並轉換為彩球機相容格式
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    
    console.log(`🎰 獲取彩球機照片，限制：${limit || '無'}`)
    
    // 從 photo-wall 獲取公開照片
    let query = supabase
      .from('photos')
      .select(`
        *,
        uploader:users!photos_user_id_fkey(display_name, avatar_url)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    
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
    
    // 轉換為彩球機相容格式
    const lotteryMachinePhotos = (photos || []).map(photo => ({
      id: photo.id,
      image_url: photo.image_url,
      user_id: photo.user_id,
      display_name: photo.uploader?.display_name || '匿名用戶',
      blessing_message: photo.blessing_message,
      avatar_url: photo.uploader?.avatar_url || '/default-avatar.png',
      thumbnail_small_url: photo.thumbnail_small_url,
      thumbnail_medium_url: photo.thumbnail_medium_url,
      thumbnail_large_url: photo.thumbnail_large_url,
      media_type: photo.media_type || 'image'
    }))
    
    console.log(`✅ 成功獲取 ${lotteryMachinePhotos.length} 張照片`)
    
    return NextResponse.json({
      success: true,
      photos: lotteryMachinePhotos,
      count: lotteryMachinePhotos.length
    })
    
  } catch (error) {
    console.error('❌ 照片列表 API 錯誤:', error)
    return NextResponse.json({ 
      error: '獲取照片列表失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
