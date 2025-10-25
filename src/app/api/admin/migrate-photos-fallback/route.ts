import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 使用外部圖片處理服務作為備選方案
async function processImageWithExternalService(imageUrl: string, photoId: number): Promise<{
  thumbnailUrl: string
  fileName: string
  width: number
  height: number
}> {
  try {
    // 使用 Vercel 無服務器圖片處理 API
    // 這裡我們使用一個簡單的圖片調整服務
    const response = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=150&h=150&fit=inside&output=webp`)
    
    if (!response.ok) {
      throw new Error(`外部圖片處理服務請求失敗: ${response.status}`)
    }
    
    // 下載處理後的圖片
    const imageBuffer = await response.arrayBuffer()
    
    // 上傳到 Supabase Storage
    const supabase = createSupabaseAdmin()
    const fileName = `thumb_${photoId}_${Date.now()}.webp`
    
    const { data, error } = await supabase.storage
      .from('wedding-photos')
      .upload(`thumbnails/${fileName}`, imageBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp'
      })
    
    if (error) {
      throw new Error(`縮圖上傳失敗: ${error.message}`)
    }
    
    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('wedding-photos')
      .getPublicUrl(`thumbnails/${fileName}`)
    
    return {
      thumbnailUrl: urlData.publicUrl,
      fileName,
      width: 150,
      height: 150
    }
  } catch (error) {
    throw new Error(`圖片處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const maxExecutionTime = 45000 // 45秒，留5秒給Vercel的超時緩衝
  
  try {
    // 檢查執行時間
    if (Date.now() - startTime > maxExecutionTime) {
      return NextResponse.json({
        error: '執行超時',
        details: '遷移操作超時，請稍後再試'
      }, { status: 408 })
    }

    const supabase = createSupabaseAdmin()
    
    // 獲取一批需要遷移的照片
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, image_url, user_id, created_at')
      .is('has_thumbnail', false)
      .limit(3) // 減少批次大小以避免超時
    
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
      // 檢查執行時間
      if (Date.now() - startTime > maxExecutionTime) {
        console.log('⏰ 遷移操作即將超時，停止處理')
        break
      }

      try {
        console.log(`🔄 開始遷移照片 ${photo.id} (使用外部服務)`)
        
        // 使用外部圖片處理服務
        const thumbnailData = await processImageWithExternalService(photo.image_url, photo.id)
        
        // 更新資料庫
        const { error: updateError } = await supabase
          .from('photos')
          .update({
            thumbnail_url: thumbnailData.thumbnailUrl,
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
    
    const executionTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      message: `成功遷移 ${migratedCount} 張照片，失敗 ${failedCount} 張 (使用外部服務)`,
      data: {
        migrated: migratedCount,
        failed: failedCount,
        total: photos.length,
        results,
        executionTime: `${executionTime}ms`,
        environment: process.env.NODE_ENV || 'unknown',
        method: 'external-service'
      }
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('照片遷移錯誤:', error)
    return NextResponse.json({
      error: '照片遷移失敗',
      details: error instanceof Error ? error.message : '未知錯誤',
      executionTime: `${executionTime}ms`,
      environment: process.env.NODE_ENV || 'unknown',
      method: 'external-service'
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
        estimatedRemainingTime: withoutThumbnailCount * 3, // 外部服務通常更快
        method: 'external-service'
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