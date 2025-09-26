import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🚀 開始初始化 display_order 欄位...')
    
    // 1. 嘗試查詢現有的 display_order
    const { data: existingQuestions, error: queryError } = await supabase
      .from('questions')
      .select('id, display_order')
      .limit(1)
    
    if (queryError) {
      // display_order 欄位可能不存在，嘗試添加
      console.log('⚠️ display_order 欄位可能不存在，嘗試創建...')
      
      // 執行 ALTER TABLE 添加欄位
      const { data: alterResult, error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          -- 添加 display_order 欄位（如果不存在）
          ALTER TABLE questions 
          ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
          
          -- 為現有題目設定初始排序
          UPDATE questions 
          SET display_order = id 
          WHERE display_order = 0 OR display_order IS NULL;
          
          -- 添加索引
          CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);
        `
      })
      
      if (alterError) {
        console.error('❌ 創建 display_order 欄位失敗:', alterError)
        return NextResponse.json({
          error: '無法創建 display_order 欄位',
          details: alterError.message,
          suggestion: '請手動在 Supabase SQL Editor 中執行 database/add-question-order.sql'
        }, { status: 500 })
      }
    }
    
    // 2. 獲取所有題目並確保都有 display_order
    const { data: allQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, question_text, display_order')
      .order('id', { ascending: true })
    
    if (fetchError) {
      console.error('❌ 獲取題目失敗:', fetchError)
      return NextResponse.json({
        error: '獲取題目失敗',
        details: fetchError.message
      }, { status: 500 })
    }
    
    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有題目需要初始化',
        initialized_count: 0
      })
    }
    
    // 3. 為沒有 display_order 的題目設定順序
    const questionsToUpdate = allQuestions.filter(q => 
      q.display_order === null || q.display_order === 0
    )
    
    if (questionsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有題目的 display_order 已經設定完成',
        total_questions: allQuestions.length,
        initialized_count: 0
      })
    }
    
    // 4. 批量更新沒有 display_order 的題目
    let successCount = 0
    const maxOrder = Math.max(...allQuestions.map(q => q.display_order || 0))
    
    for (let i = 0; i < questionsToUpdate.length; i++) {
      const question = questionsToUpdate[i]
      const newOrder = maxOrder + i + 1
      
      const { error: updateError } = await supabase
        .from('questions')
        .update({ display_order: newOrder })
        .eq('id', question.id)
      
      if (updateError) {
        console.error(`❌ 更新題目 ${question.id} 的 display_order 失敗:`, updateError)
      } else {
        successCount++
      }
    }
    
    console.log(`✅ display_order 初始化完成，成功處理 ${successCount}/${questionsToUpdate.length} 個題目`)
    
    // 5. 返回最終狀態
    const { data: finalQuestions, error: finalError } = await supabase
      .from('questions')
      .select('id, question_text, display_order')
      .order('display_order', { ascending: true })
    
    return NextResponse.json({
      success: true,
      message: `display_order 初始化完成`,
      total_questions: allQuestions.length,
      initialized_count: successCount,
      failed_count: questionsToUpdate.length - successCount,
      final_questions: finalQuestions?.map(q => ({
        id: q.id,
        question_text: q.question_text?.substring(0, 50) + '...',
        display_order: q.display_order
      }))
    })
    
  } catch (error) {
    console.error('❌ 初始化 display_order 錯誤:', error)
    return NextResponse.json({
      error: '初始化失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
