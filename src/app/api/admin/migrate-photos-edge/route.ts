import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 使用 Vercel Edge Functions 的預構建 Sharp
// 這個方法利用 Vercel 的預構建環境，其中 Sharp 已經預先安裝
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
      errorMessage?: string
    }> = []
    
    // 使用 Vercel Edge Functions 的預構建 Sharp
    // 在 Edge Functions 環境中，Sharp 應該已經預先安裝
    let sharp
    try {
      // 嘗試直接導入 Sharp（在 Edge Functions 中應該可用）
      const sharpModule = await import('sharp')
      sharp = sharpModule.default || sharpModule
      console.log('✅ Sharp 庫成功載入 (Edge Functions 預構建)')
    } catch (error) {
      console.error('❌ Sharp 庫載入失敗:', error)
      return NextResponse.json({
        error: 'Sharp 庫載入失敗',
        details: 'Edge Functions 環境中 Sharp 庫不可用，請檢查 Vercel 配置',
        error: error instanceof Error ? error.message : '未知錯誤'
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
        
        // 下載原始圖片
        const response = await fetch(photo.image_url)
        if (!response.ok) {
          throw new Error(`圖片下載失敗: ${response.status} ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const originalBuffer = Buffer.from(arrayBuffer)
        
        // 生成縮圖
        const fileName = `edge_${photo.id}_${Date.now()}.jpg`
        const thumbnailBuffer = await sharp(originalBuffer)
          .resize(150, null, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 85 })
          .toBuffer()
        
        // 上傳縮圖
        const { data, error: uploadError } = await supabase.storage
          .from('wedding-photos')
          .upload(`thumbnails/${fileName}`, thumbnailBuffer, {
            cacheControl: '3600',
            upsert: true
          })
        
        if (uploadError) {
          throw new Error(`縮圖上傳失敗: ${uploadError.message}`)
        }
        
        // 獲取公開 URL
        const { data: urlData } = supabase.storage
          .from('wedding-photos')
          .getPublicUrl(`thumbnails/${fileName}`)
        
        // 更新資料庫
        const { error: updateError } = await supabase
          .from('photos')
          .update({
            thumbnail_url: urlData.publicUrl,
            thumbnail_file_name: fileName,
            has_thumbnail: true,
            thumbnail_width: 150,
            thumbnail_height: 150,
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
          errorMessage
        })
      }
    }
    
    const executionTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      message: `成功遷移 ${migratedCount} 張照片，失敗 ${failedCount} 張 (Edge Functions)`,
      data: { 
        migrated: migratedCount, 
        failed: failedCount,
        total: photos.length,
        results,
        executionTime: `${executionTime}ms`,
        environment: process.env.NODE_ENV || 'unknown',
        method: 'edge-functions'
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
      method: 'edge-functions'
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
        estimatedRemainingTime: withoutThumbnailCount * 3, // Edge Functions 通常更快
        method: 'edge-functions'
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