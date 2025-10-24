import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 動態導入 imageProcessor 以避免 Vercel 環境中的模塊加載問題
async function getImageProcessor() {
  try {
    const { imageProcessor } = await import('@/lib/image-processing')
    return imageProcessor
  } catch (error) {
    console.error('無法載入圖片處理器:', error)
    throw new Error('圖片處理模塊載入失敗，請檢查 Sharp 依賴是否正確安裝')
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
    
    // 獲取一批需要遷移的照片（減少批次大小以避免超時）
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, image_url, user_id, created_at')
      .is('has_thumbnail', false)
      .limit(5) // 減少批次大小
    
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
    
    // 動態載入圖片處理器
    let imageProcessor
    try {
      imageProcessor = await getImageProcessor()
    } catch (processorError) {
      return NextResponse.json({
        error: '圖片處理器載入失敗',
        details: processorError instanceof Error ? processorError.message : '未知錯誤'
      }, { status: 500 })
    }
    
    for (const photo of photos) {
      // 檢查執行時間
      if (Date.now() - startTime > maxExecutionTime) {
        console.log('⏰ 遷移操作即將超時，停止處理')
        break
      }

      try {
        console.log(`🔄 開始遷移照片 ${photo.id}`)
        
        // 下載原始圖片（添加超時控制）
        const downloadPromise = imageProcessor.downloadImage(photo.image_url)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('圖片下載超時')), 10000)
        )
        
        const originalBuffer = await Promise.race([downloadPromise, timeoutPromise]) as Buffer
        
        // 生成縮圖（添加超時控制）
        const fileName = `migration_${photo.id}_${Date.now()}.jpg`
        const thumbnailPromise = imageProcessor.generateThumbnail(originalBuffer, fileName)
        const thumbnailTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('縮圖生成超時')), 15000)
        )
        
        const thumbnailData = await Promise.race([thumbnailPromise, thumbnailTimeoutPromise]) as {
          fileName: string
          buffer: Buffer
          width: number
          height: number
        }
        
        // 上傳縮圖（添加超時控制）
        const uploadPromise = imageProcessor.uploadThumbnail(
          thumbnailData.buffer,
          thumbnailData.fileName
        )
        const uploadTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('縮圖上傳超時')), 10000)
        )
        
        const thumbnailUrl = await Promise.race([uploadPromise, uploadTimeoutPromise]) as string
        
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
    
    const executionTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      message: `成功遷移 ${migratedCount} 張照片，失敗 ${failedCount} 張`,
      data: {
        migrated: migratedCount,
        failed: failedCount,
        total: photos.length,
        results,
        executionTime: `${executionTime}ms`,
        environment: process.env.NODE_ENV || 'unknown'
      }
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('照片遷移錯誤:', error)
    return NextResponse.json({
      error: '照片遷移失敗',
      details: error instanceof Error ? error.message : '未知錯誤',
      executionTime: `${executionTime}ms`,
      environment: process.env.NODE_ENV || 'unknown'
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