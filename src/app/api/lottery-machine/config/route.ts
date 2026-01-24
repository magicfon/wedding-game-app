import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取彩球機設定
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('📋 獲取彩球機設定...')
    
    const { data: config, error } = await supabase
      .from('lottery_machine_config')
      .select('*')
      .single()
    
    if (error) {
      console.error('❌ 獲取設定失敗:', error)
      return NextResponse.json({
        error: '獲取設定失敗',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('✅ 成功獲取設定')
    
    return NextResponse.json({
      success: true,
      config: config || {
        track_config: {},
        physics: {},
        chamber_style: {},
        platform_style: {}
      }
    })
    
  } catch (error) {
    console.error('❌ 獲取設定時發生錯誤:', error)
    return NextResponse.json({
      error: '獲取設定時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 儲存彩球機設定
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    const { trackConfig, physics, chamberStyle, platformStyle } = body
    
    console.log('💾 儲存彩球機設定...')
    console.log('  - trackConfig:', trackConfig)
    console.log('  - physics:', physics)
    console.log('  - chamberStyle:', chamberStyle)
    console.log('  - platformStyle:', platformStyle)
    
    // 準備更新的欄位
    const updateFields: any = {
      updated_at: new Date().toISOString()
    }
    
    if (trackConfig !== undefined) {
      updateFields.track_config = trackConfig
    }
    
    if (physics !== undefined) {
      updateFields.physics = physics
    }
    
    if (chamberStyle !== undefined) {
      updateFields.chamber_style = chamberStyle
    }
    
    if (platformStyle !== undefined) {
      updateFields.platform_style = platformStyle
    }
    
    // 更新設定
    const { data: updatedConfig, error } = await supabase
      .from('lottery_machine_config')
      .update(updateFields)
      .eq('id', 1)
      .select()
      .single()
    
    if (error) {
      console.error('❌ 儲存設定失敗:', error)
      return NextResponse.json({
        error: '儲存設定失敗',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('✅ 設定已儲存')
    
    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: '設定已儲存'
    })
    
  } catch (error) {
    console.error('❌ 儲存設定時發生錯誤:', error)
    return NextResponse.json({
      error: '儲存設定時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
