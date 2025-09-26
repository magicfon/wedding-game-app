import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🚀 開始添加 display_order 欄位到 questions 表...')
    
    // 1. 添加 display_order 欄位
    console.log('📝 步驟 1: 添加 display_order 欄位...')
    const { data: alterData, error: alterError } = await supabase
      .from('questions')
      .select('*')
      .limit(0) // 不需要數據，只是測試表結構
    
    // 如果查詢失敗，可能是因為欄位不存在，我們需要用 RPC 來執行 SQL
    console.log('📝 步驟 2: 執行 ALTER TABLE 語句...')
    
    // 使用原生 SQL 來添加欄位
    const alterSql = `
      -- 添加 display_order 欄位（如果不存在）
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'questions' AND column_name = 'display_order'
        ) THEN
          ALTER TABLE questions ADD COLUMN display_order INTEGER DEFAULT 0;
          RAISE NOTICE 'display_order 欄位已添加';
        ELSE
          RAISE NOTICE 'display_order 欄位已存在';
        END IF;
      END $$;
    `
    
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
      query: alterSql
    })
    
    if (sqlError) {
      console.error('❌ 執行 ALTER TABLE 失敗:', sqlError)
      // 嘗試另一種方法
      console.log('📝 嘗試直接 ALTER TABLE...')
      
      const { error: directAlterError } = await supabase
        .from('_realtime')
        .select('*')
        .limit(0)
      
      // 直接嘗試添加欄位的 SQL
      const directSql = 'ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;'
      
      try {
        // 使用 Supabase 的 SQL 執行功能
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
          },
          body: JSON.stringify({ query: directSql })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        console.log('✅ 直接 SQL 執行成功')
      } catch (directError) {
        console.error('❌ 直接 SQL 執行也失敗:', directError)
        return NextResponse.json({
          error: '無法添加 display_order 欄位',
          details: sqlError.message,
          suggestion: '請手動在 Supabase SQL Editor 中執行以下 SQL：\n\nALTER TABLE questions ADD COLUMN display_order INTEGER DEFAULT 0;'
        }, { status: 500 })
      }
    }
    
    // 2. 驗證欄位是否成功添加
    console.log('📝 步驟 3: 驗證欄位是否添加成功...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('questions')
      .select('id, display_order')
      .limit(1)
    
    if (verifyError) {
      console.error('❌ 驗證失敗，欄位可能未成功添加:', verifyError)
      return NextResponse.json({
        error: '欄位添加可能失敗',
        details: verifyError.message,
        suggestion: '請手動在 Supabase SQL Editor 中執行：ALTER TABLE questions ADD COLUMN display_order INTEGER DEFAULT 0;'
      }, { status: 500 })
    }
    
    // 3. 為現有題目設定初始排序
    console.log('📝 步驟 4: 為現有題目設定初始排序...')
    const { data: allQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, display_order')
      .order('id', { ascending: true })
    
    if (fetchError) {
      console.error('❌ 獲取題目失敗:', fetchError)
      return NextResponse.json({
        error: '獲取題目失敗',
        details: fetchError.message
      }, { status: 500 })
    }
    
    if (!allQuestions || allQuestions.length === 0) {
      console.log('✅ 沒有題目需要設定排序')
      return NextResponse.json({
        success: true,
        message: 'display_order 欄位添加成功，但沒有題目需要設定排序',
        questions_count: 0
      })
    }
    
    // 4. 批量設定初始排序
    let updateCount = 0
    for (let i = 0; i < allQuestions.length; i++) {
      const question = allQuestions[i]
      const newOrder = i + 1
      
      const { error: updateError } = await supabase
        .from('questions')
        .update({ display_order: newOrder })
        .eq('id', question.id)
      
      if (updateError) {
        console.error(`❌ 更新題目 ${question.id} 排序失敗:`, updateError)
      } else {
        updateCount++
      }
    }
    
    // 5. 添加索引提升性能
    console.log('📝 步驟 5: 添加索引...')
    const indexSql = 'CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);'
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        },
        body: JSON.stringify({ query: indexSql })
      })
      
      if (response.ok) {
        console.log('✅ 索引創建成功')
      }
    } catch (indexError) {
      console.log('⚠️ 索引創建失敗，但不影響主要功能:', indexError)
    }
    
    console.log(`✅ display_order 欄位設定完成！成功處理 ${updateCount}/${allQuestions.length} 個題目`)
    
    return NextResponse.json({
      success: true,
      message: `display_order 欄位添加並初始化成功`,
      questions_count: allQuestions.length,
      updated_count: updateCount,
      failed_count: allQuestions.length - updateCount
    })
    
  } catch (error) {
    console.error('❌ 添加 display_order 欄位錯誤:', error)
    return NextResponse.json({
      error: '添加欄位失敗',
      details: error instanceof Error ? error.message : '未知錯誤',
      suggestion: '請手動在 Supabase SQL Editor 中執行：ALTER TABLE questions ADD COLUMN display_order INTEGER DEFAULT 0;'
    }, { status: 500 })
  }
}
