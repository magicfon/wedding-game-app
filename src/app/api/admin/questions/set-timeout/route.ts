import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 直接設定所有題目超時扣10分
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('🔧 開始批量設定所有題目超時扣10分...')
    
    // 直接更新所有題目
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .update({
        timeout_penalty_enabled: true,
        timeout_penalty_score: 10,
        updated_at: new Date().toISOString()
      })
      .neq('id', 0) // 更新所有題目
      .select('id, question_text, timeout_penalty_enabled, timeout_penalty_score')

    if (updateError) {
      console.error('❌ 批量更新失敗:', updateError)
      return NextResponse.json({ 
        error: '批量更新失敗',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log(`✅ 批量更新完成，共更新 ${updatedQuestions?.length || 0} 個題目`)

    // 獲取更新後的統計
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('id, timeout_penalty_enabled, timeout_penalty_score')
    
    const stats = {
      total: allQuestions?.length || 0,
      timeout_enabled: allQuestions?.filter(q => q.timeout_penalty_enabled).length || 0,
      penalty_10: allQuestions?.filter(q => q.timeout_penalty_score === 10).length || 0
    }

    return NextResponse.json({
      success: true,
      message: `✅ 成功將 ${updatedQuestions?.length || 0} 個題目設定為超時扣10分`,
      updated_count: updatedQuestions?.length || 0,
      statistics: stats,
      updated_questions: updatedQuestions
    })

  } catch (error) {
    console.error('❌ 設定超時扣分錯誤:', error)
    return NextResponse.json({ 
      error: '設定失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 獲取當前設定狀況
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, timeout_penalty_enabled, timeout_penalty_score')
      .order('id')

    if (error) {
      return NextResponse.json({ error: '獲取題目失敗' }, { status: 500 })
    }

    const stats = {
      total: questions?.length || 0,
      timeout_enabled: questions?.filter(q => q.timeout_penalty_enabled).length || 0,
      timeout_disabled: questions?.filter(q => !q.timeout_penalty_enabled).length || 0,
      penalty_10: questions?.filter(q => q.timeout_penalty_score === 10).length || 0,
      ready: questions?.filter(q => q.timeout_penalty_enabled && q.timeout_penalty_score === 10).length || 0
    }

    return NextResponse.json({
      success: true,
      questions,
      statistics: stats
    })

  } catch (error) {
    console.error('獲取題目狀況錯誤:', error)
    return NextResponse.json({ 
      error: '獲取失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
