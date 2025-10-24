import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { imageProcessor } from '@/lib/image-processing'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    // 獲取一批需要遷移的照片
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, image_url, user_id, created_at')
      .is('has_thumbnail', false)
      .limit(10)
    
    if (error) {
      throw error
    }
    
    if (!photos || photos.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有需要遷移的照片',
        data: { migrated: 0, total: 0 }
      })
    }
    
    let migratedCount = 0
    let failedCount = 0
    const results: Array<{
      id: number
      success: boolean
      error?: string
    }> = []
    
    for (const photo of photos) {
      try {
        console.log(`🔄 開始遷移照片 ${photo.id}`)
        
        // 下載原始圖片
        const originalBuffer = await imageProcessor.downloadImage(photo.image_url)
        
        // 生成縮圖
        const fileName = `migration_${photo.id}_${Date.now()}.jpg`
        const thumbnailData = await imageProcessor.generateThumbnail(originalBuffer, fileName)
        
        // 上傳縮圖
        const thumbnailUrl = await imageProcessor.uploadThumbnail(
          thumbnailData.buffer,
          thumbnailData.fileName
        )
        
        // 更新資料庫
        const { error: updateError } = await supabase
          .from('photos')
          .update({
            thumbnail_url: thumbnailUrl,
            thumbnail_file_name: thumbnailData.fileName,
            has_thumbnail: true,
            thumbnail_width: thumbnailData.width,
            thumbnail_height: thumbnailData.height,
            updated_at: new Date().toISOString()
          })
          .eq('id', photo.id)
        
        if (updateError) {
          throw updateError
        }
        
        migratedCount++
        console.log(`✅ 成功遷移照片 ${photo.id}`)
        results.push({ id: photo.id, success: true })
        
      } catch (error) {
        failedCount++
        const errorMessage = error instanceof Error ? error.message : '未知錯誤'
        console.error(`❌ 遷移照片 ${photo.id} 失敗:`, errorMessage)
        results.push({ 
          id: photo.id, 
          success: false, 
          error: errorMessage 
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `成功遷移 ${migratedCount} 張照片，失敗 ${failedCount} 張`,
      data: { 
        migrated: migratedCount, 
        failed: failedCount,
        total: photos.length,
        results
      }
    })
    
  } catch (error) {
    console.error('照片遷移錯誤:', error)
    return NextResponse.json({
      error: '照片遷移失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    // 獲取遷移統計信息
    const { data: totalPhotos, error: totalError } = await supabase
      .from('photos')
      .select('id')
    
    if (totalError) {
      throw totalError
    }
    
    const { data: photosWithThumbnails, error: thumbError } = await supabase
      .from('photos')
      .select('id')
      .eq('has_thumbnail', true)
    
    if (thumbError) {
      throw thumbError
    }
    
    const { data: photosWithoutThumbnails, error: noThumbError } = await supabase
      .from('photos')
      .select('id')
      .is('has_thumbnail', false)
    
    if (noThumbError) {
      throw noThumbError
    }
    
    const totalCount = totalPhotos?.length || 0
    const withThumbnailCount = photosWithThumbnails?.length || 0
    const withoutThumbnailCount = photosWithoutThumbnails?.length || 0
    const progressPercentage = totalCount > 0 
      ? Math.round((withThumbnailCount / totalCount) * 100) 
      : 0
    
    return NextResponse.json({
      success: true,
      data: {
        total: totalCount,
        withThumbnails: withThumbnailCount,
        withoutThumbnails: withoutThumbnailCount,
        progressPercentage,
        estimatedRemainingTime: withoutThumbnailCount * 5 // 假設每張照片5秒
      }
    })
    
  } catch (error) {
    console.error('獲取遷移狀態錯誤:', error)
    return NextResponse.json({
      error: '獲取遷移狀態失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}