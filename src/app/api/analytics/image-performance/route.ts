import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metrics, additionalData, timestamp } = body

    // 驗證必要欄位
    if (!metrics || !metrics.imageUrl || !metrics.loadTime) {
      return NextResponse.json({ 
        error: '缺少必要的效能指標資料' 
      }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // 儲存到資料庫（可選：根據需求決定是否儲存詳細數據）
    // 這裡我們創建一個簡化的記錄表來追蹤影像效能
    const { data, error } = await supabase
      .from('image_performance_logs')
      .insert({
        image_url: metrics.imageUrl,
        load_time: metrics.loadTime,
        thumbnail_size: metrics.thumbnailSize,
        device_type: getDeviceType(metrics.deviceInfo.userAgent),
        connection_type: metrics.deviceInfo.connection?.effectiveType,
        success: metrics.success,
        error_message: metrics.error,
        viewport_width: metrics.deviceInfo.viewport.width,
        viewport_height: metrics.deviceInfo.viewport.height,
        device_pixel_ratio: metrics.deviceInfo.devicePixelRatio,
        timestamp: new Date(timestamp).toISOString(),
        // 儲存額外的 Vercel 特定資料
        vercel_options: additionalData?.vercelOptions || null,
        original_url: additionalData?.originalUrl || null
      })
      .select()
      .single()

    if (error) {
      console.error('影像效能數據儲存失敗:', error)
      // 即使儲存失敗，我們也返回成功，因為主要目的是收集數據
    }

    // 計算並更新統計數據
    await updatePerformanceStats(metrics)

    return NextResponse.json({
      success: true,
      message: '影像效能數據已記錄',
      data: data || null
    })

  } catch (error) {
    console.error('影像效能分析錯誤:', error)
    return NextResponse.json({ 
      error: '處理影像效能數據時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 獲取效能統計數據
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h' // 24h, 7d, 30d
    const thumbnailSize = searchParams.get('thumbnailSize')

    const supabase = createSupabaseAdmin()

    // 計算時間範圍
    const now = new Date()
    let startTime: Date

    switch (timeRange) {
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default: // 24h
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // 構建查詢
    let query = supabase
      .from('image_performance_logs')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', now.toISOString())

    if (thumbnailSize) {
      query = query.eq('thumbnail_size', thumbnailSize)
    }

    const { data, error } = await query.order('timestamp', { ascending: false })

    if (error) {
      console.error('獲取效能統計失敗:', error)
      return NextResponse.json({ 
        error: '獲取效能統計失敗',
        details: error.message 
      }, { status: 500 })
    }

    // 計算統計數據
    const stats = calculateStats(data || [])

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        thumbnailSize,
        totalRecords: data?.length || 0,
        stats,
        rawData: data
      }
    })

  } catch (error) {
    console.error('獲取影像效能統計錯誤:', error)
    return NextResponse.json({ 
      error: '獲取影像效能統計時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 輔助函數：從 User Agent 判斷設備類型
function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'mobile'
  }
  if (/Tablet/.test(userAgent)) {
    return 'tablet'
  }
  return 'desktop'
}

// 輔助函數：更新效能統計
async function updatePerformanceStats(metrics: any) {
  try {
    const supabase = createSupabaseAdmin()
    
    // 這裡可以實現統計數據的聚合更新
    // 例如：更新平均載入時間、成功率等
    
    // 簡化版本：更新每日統計
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase.rpc('update_daily_image_stats', {
      p_date: today,
      p_load_time: metrics.loadTime,
      p_success: metrics.success,
      p_thumbnail_size: metrics.thumbnailSize,
      p_device_type: getDeviceType(metrics.deviceInfo.userAgent)
    })

    if (error) {
      console.error('更新每日統計失敗:', error)
    }
  } catch (error) {
    console.error('更新效能統計失敗:', error)
  }
}

// 輔助函數：計算統計數據
function calculateStats(data: any[]) {
  if (data.length === 0) {
    return {
      totalImages: 0,
      successfulLoads: 0,
      failedLoads: 0,
      successRate: 0,
      averageLoadTime: 0,
      medianLoadTime: 0,
      p95LoadTime: 0,
      byThumbnailSize: {},
      byDeviceType: {},
      byConnectionType: {}
    }
  }

  const successfulLoads = data.filter(d => d.success)
  const failedLoads = data.filter(d => !d.success)
  const loadTimes = successfulLoads.map(d => d.load_time).sort((a, b) => a - b)

  // 計算百分位數
  const median = loadTimes.length > 0 
    ? loadTimes[Math.floor(loadTimes.length / 2)] 
    : 0
  const p95 = loadTimes.length > 0 
    ? loadTimes[Math.floor(loadTimes.length * 0.95)] 
    : 0

  // 按縮圖尺寸分組
  const byThumbnailSize = data.reduce((acc, d) => {
    const size = d.thumbnail_size || 'unknown'
    if (!acc[size]) {
      acc[size] = { count: 0, success: 0, avgLoadTime: 0 }
    }
    acc[size].count++
    if (d.success) {
      acc[size].success++
      acc[size].avgLoadTime += d.load_time
    }
    return acc
  }, {} as Record<string, any>)

  // 計算平均載入時間
  Object.values(byThumbnailSize).forEach((stats: any) => {
    if (stats.success > 0) {
      stats.avgLoadTime = stats.avgLoadTime / stats.success
    }
    stats.successRate = (stats.success / stats.count) * 100
  })

  // 按設備類型分組
  const byDeviceType = data.reduce((acc, d) => {
    const type = d.device_type || 'unknown'
    if (!acc[type]) {
      acc[type] = { count: 0, success: 0, avgLoadTime: 0 }
    }
    acc[type].count++
    if (d.success) {
      acc[type].success++
      acc[type].avgLoadTime += d.load_time
    }
    return acc
  }, {} as Record<string, any>)

  Object.values(byDeviceType).forEach((stats: any) => {
    if (stats.success > 0) {
      stats.avgLoadTime = stats.avgLoadTime / stats.success
    }
    stats.successRate = (stats.success / stats.count) * 100
  })

  // 按連接類型分組
  const byConnectionType = data.reduce((acc, d) => {
    const type = d.connection_type || 'unknown'
    if (!acc[type]) {
      acc[type] = { count: 0, success: 0, avgLoadTime: 0 }
    }
    acc[type].count++
    if (d.success) {
      acc[type].success++
      acc[type].avgLoadTime += d.load_time
    }
    return acc
  }, {} as Record<string, any>)

  Object.values(byConnectionType).forEach((stats: any) => {
    if (stats.success > 0) {
      stats.avgLoadTime = stats.avgLoadTime / stats.success
    }
    stats.successRate = (stats.success / stats.count) * 100
  })

  return {
    totalImages: data.length,
    successfulLoads: successfulLoads.length,
    failedLoads: failedLoads.length,
    successRate: (successfulLoads.length / data.length) * 100,
    averageLoadTime: successfulLoads.reduce((sum, d) => sum + d.load_time, 0) / successfulLoads.length,
    medianLoadTime: median,
    p95LoadTime: p95,
    byThumbnailSize,
    byDeviceType,
    byConnectionType
  }
}