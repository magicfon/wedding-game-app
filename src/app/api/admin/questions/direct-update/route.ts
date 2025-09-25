import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// 直接使用管理員權限更新所有題目超時設定
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔧 使用管理員權限直接更新所有題目超時設定...')
    
    // 使用管理員權限直接更新
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .update({
        timeout_penalty_enabled: true,
        timeout_penalty_score: 10
      })
      .select('id, question_text, timeout_penalty_enabled, timeout_penalty_score')

    if (updateError) {
      console.error('❌ 直接更新失敗:', updateError)
      return NextResponse.json({ 
        success: false,
        error: '直接更新失敗',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log(`✅ 直接更新完成，共更新 ${updatedQuestions?.length || 0} 個題目`)

    return NextResponse.json({
      success: true,
      message: `✅ 成功將 ${updatedQuestions?.length || 0} 個題目設定為超時扣10分`,
      updated_count: updatedQuestions?.length || 0,
      updated_questions: updatedQuestions
    })

  } catch (error) {
    console.error('❌ 直接更新錯誤:', error)
    return NextResponse.json({ 
      success: false,
      error: '直接更新失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
