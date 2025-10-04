import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 檢查符合抽獎資格的用戶
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('🎰 檢查符合抽獎資格的用戶...')
    
    // 使用資料庫函數查詢符合資格的用戶（至少1張公開照片）
    const { data: eligibleUsers, error } = await supabase
      .rpc('get_lottery_eligible_users')
    
    if (error) {
      console.error('❌ 查詢符合資格用戶失敗:', error)
      return NextResponse.json({ 
        error: '查詢符合資格用戶失敗',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log(`✅ 找到 ${eligibleUsers?.length || 0} 位符合資格的用戶`)
    
    return NextResponse.json({
      success: true,
      eligible_users: eligibleUsers || [],
      count: eligibleUsers?.length || 0
    })
    
  } catch (error) {
    console.error('❌ 檢查資格時發生錯誤:', error)
    return NextResponse.json({ 
      error: '檢查資格時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

