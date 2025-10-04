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
        blessing_message
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
    
    // 獲取用戶資訊
    const userIds = [...new Set(photos?.map(p => p.user_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('users')
      .select('line_id, display_name, avatar_url')
      .in('line_id', userIds)
    
    // 建立用戶查找表
    const userMap = new Map(users?.map(u => [u.line_id, u]) || [])
    
    // 格式化資料
    const formattedPhotos = photos?.map(photo => {
      const user = userMap.get(photo.user_id)
      return {
        id: photo.id,
        image_url: photo.image_url,
        user_id: photo.user_id,
        blessing_message: photo.blessing_message,
        display_name: user?.display_name || '匿名用戶',
        avatar_url: user?.avatar_url || ''
      }
    }) || []
    
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

