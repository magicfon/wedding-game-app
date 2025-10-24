import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const healthStatus = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'checking' as 'healthy' | 'error' | 'checking',
        storage: 'checking' as 'healthy' | 'error' | 'checking',
        imageProcessing: 'checking' as 'healthy' | 'error' | 'checking'
      },
      details: {} as Record<string, any>
    }

    // 檢查資料庫連接
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('count')
        .limit(1)
      
      if (error) {
        healthStatus.services.database = 'error'
        healthStatus.details.database = error.message
      } else {
        healthStatus.services.database = 'healthy'
        healthStatus.details.database = 'Connection successful'
      }
    } catch (dbError) {
      healthStatus.services.database = 'error'
      healthStatus.details.database = dbError instanceof Error ? dbError.message : 'Unknown database error'
    }

    // 檢查儲存服務
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets()
      
      if (error) {
        healthStatus.services.storage = 'error'
        healthStatus.details.storage = error.message
      } else {
        healthStatus.services.storage = 'healthy'
        healthStatus.details.storage = `Found ${buckets?.length || 0} buckets`
      }
    } catch (storageError) {
      healthStatus.services.storage = 'error'
      healthStatus.details.storage = storageError instanceof Error ? storageError.message : 'Unknown storage error'
    }

    // 檢查圖片處理服務（通過檢查遷移狀態）
    try {
      const { data: totalPhotos, error: totalError } = await supabase
        .from('photos')
        .select('id')
      
      const { data: photosWithThumbnails, error: thumbError } = await supabase
        .from('photos')
        .select('id')
        .eq('has_thumbnail', true)
      
      if (totalError || thumbError) {
        healthStatus.services.imageProcessing = 'error'
        healthStatus.details.imageProcessing = 'Failed to check thumbnail status'
      } else {
        const totalCount = totalPhotos?.length || 0
        const withThumbnailCount = photosWithThumbnails?.length || 0
        healthStatus.services.imageProcessing = 'healthy'
        healthStatus.details.imageProcessing = {
          totalPhotos: totalCount,
          photosWithThumbnails: withThumbnailCount,
          thumbnailProgress: totalCount > 0 ? Math.round((withThumbnailCount / totalCount) * 100) : 0
        }
      }
    } catch (imageError) {
      healthStatus.services.imageProcessing = 'error'
      healthStatus.details.imageProcessing = imageError instanceof Error ? imageError.message : 'Unknown image processing error'
    }

    // 確定整體狀態
    const serviceValues = Object.values(healthStatus.services)
    if (serviceValues.some(service => service === 'error')) {
      healthStatus.status = 'degraded'
    }
    
    if (serviceValues.every(service => service === 'healthy')) {
      healthStatus.status = 'healthy'
    }

    return NextResponse.json({
      success: true,
      data: healthStatus
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}