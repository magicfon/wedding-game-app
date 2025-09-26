import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 批量設定所有題目的答題時間限制
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { time_limit } = await request.json()
    
    // 驗證時間限制參數
    if (!time_limit || time_limit < 5 || time_limit > 300) {
      return NextResponse.json({ 
        error: '時間限制必須在 5-300 秒之間' 
      }, { status: 400 })
    }
    
    console.log(`🔧 開始批量設定所有題目答題時間為 ${time_limit} 秒...`)
    
    // 直接更新所有題目的時間限制
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .update({
        time_limit: time_limit,
        updated_at: new Date().toISOString()
      })
      .neq('id', 0) // 更新所有題目
      .select('id, question_text, time_limit')

    if (updateError) {
      console.error('❌ 批量更新時間限制失敗:', updateError)
      return NextResponse.json({ 
        error: '批量更新失敗',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log(`✅ 批量更新完成，共更新 ${updatedQuestions?.length || 0} 個題目的時間限制`)

    // 獲取更新後的統計
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('id, time_limit')
    
    const stats = {
      total: allQuestions?.length || 0,
      updated_time_limit: time_limit,
      questions_with_new_limit: allQuestions?.filter(q => q.time_limit === time_limit).length || 0
    }

    return NextResponse.json({
      success: true,
      message: `✅ 成功將 ${updatedQuestions?.length || 0} 個題目的答題時間設定為 ${time_limit} 秒`,
      updated_count: updatedQuestions?.length || 0,
      time_limit: time_limit,
      statistics: stats,
      updated_questions: updatedQuestions
    })

  } catch (error) {
    console.error('❌ 設定答題時間限制錯誤:', error)
    return NextResponse.json({ 
      error: '設定失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
