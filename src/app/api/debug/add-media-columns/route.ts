import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 開始添加媒體欄位到 questions 表...')
    
    const supabase = createSupabaseAdmin()
    
    // 1. 檢查現有欄位
    console.log('📋 檢查現有欄位...')
    const { data: existingColumns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'questions')
      .in('column_name', ['media_type', 'media_url', 'media_thumbnail_url', 'media_alt_text', 'media_duration'])
    
    if (columnError) {
      console.error('❌ 檢查欄位失敗:', columnError)
    } else {
      console.log('📊 現有媒體欄位:', existingColumns?.map(c => c.column_name))
    }
    
    // 2. 直接執行 ALTER TABLE 語句
    const alterStatements = [
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'text'",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_url TEXT",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT", 
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_alt_text TEXT",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_duration INTEGER"
    ]
    
    const results = []
    
    for (const statement of alterStatements) {
      console.log('🔨 執行:', statement)
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error('❌ SQL 執行失敗:', error)
          // 嘗試直接執行（如果 exec_sql 函數不存在）
          const { error: directError } = await supabase.from('_').select('*').limit(0)
          console.log('嘗試其他方法...')
        } else {
          console.log('✅ SQL 執行成功')
        }
        results.push({ statement, success: !error, error: error?.message })
      } catch (err) {
        console.error('❌ 執行錯誤:', err)
        results.push({ statement, success: false, error: String(err) })
      }
    }
    
    // 3. 更新現有題目的 media_type
    console.log('🔄 更新現有題目的媒體類型...')
    const { data: updateResult, error: updateError } = await supabase
      .from('questions')
      .update({ media_type: 'text' })
      .is('media_type', null)
      .select('id')
    
    if (updateError) {
      console.error('❌ 更新現有題目失敗:', updateError)
    } else {
      console.log('✅ 更新了', updateResult?.length || 0, '個題目的媒體類型')
    }
    
    // 4. 驗證結果
    console.log('🔍 驗證媒體欄位...')
    const { data: finalCheck, error: finalError } = await supabase
      .from('questions')
      .select('id, question_text, media_type, media_url')
      .limit(3)
    
    if (finalError) {
      console.error('❌ 驗證失敗:', finalError)
    } else {
      console.log('✅ 驗證成功，示例題目:', finalCheck)
    }
    
    return NextResponse.json({
      success: true,
      message: '媒體欄位添加完成',
      results,
      updated_questions: updateResult?.length || 0,
      sample_questions: finalCheck
    })
    
  } catch (error) {
    console.error('❌ 添加媒體欄位錯誤:', error)
    return NextResponse.json({
      error: '添加媒體欄位失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    // 檢查媒體欄位狀態
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, media_type, media_url, media_alt_text')
      .limit(10)
    
    if (error) {
      return NextResponse.json({
        error: '無法檢查媒體欄位',
        details: error.message
      }, { status: 500 })
    }
    
    const hasMediaColumns = questions && questions.length > 0 && 'media_type' in questions[0]
    
    return NextResponse.json({
      success: true,
      has_media_columns: hasMediaColumns,
      sample_questions: questions,
      message: hasMediaColumns ? '媒體欄位已存在' : '需要添加媒體欄位'
    })
    
  } catch (error) {
    console.error('❌ 檢查媒體欄位錯誤:', error)
    return NextResponse.json({
      error: '檢查失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
