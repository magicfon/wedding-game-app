import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取所有符合資格用戶的公開照片
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('🎰 獲取抽獎照片...')
    
    // 獲取所有公開照片（只取符合資格用戶的照片）
    const { data: photos, error } = await supabase
      .from('photos')
      .select(`
        id,
        image_url,
        user_id,
        blessing_message,
        users!photos_user_id_fkey (
          line_id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ 獲取照片失敗:', error)
      return NextResponse.json({ 
        error: '獲取照片失敗',
        details: error.message 
      }, { status: 500 })
    }
    
    // 格式化資料
    const formattedPhotos = photos?.map(photo => ({
      id: photo.id,
      image_url: photo.image_url,
      user_id: photo.user_id,
      blessing_message: photo.blessing_message,
      display_name: photo.users?.display_name || '匿名用戶',
      avatar_url: photo.users?.avatar_url
    })) || []
    
    console.log(`✅ 找到 ${formattedPhotos.length} 張公開照片`)
    
    return NextResponse.json({
      success: true,
      photos: formattedPhotos,
      count: formattedPhotos.length
    })
    
  } catch (error) {
    console.error('❌ 獲取照片時發生錯誤:', error)
    return NextResponse.json({ 
      error: '獲取照片時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

