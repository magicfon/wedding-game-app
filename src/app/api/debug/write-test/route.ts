import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== 寫入權限測試開始 ===')
    
    const supabase = await createSupabaseServer()
    const testResults: any[] = []

    // 測試 1：檢查 questions 表格結構
    console.log('測試 1: 檢查 questions 表格結構')
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('questions')
        .select('*')
        .limit(1)

      if (tableError) {
        testResults.push({
          test: 'questions 表格檢查',
          success: false,
          error: tableError.message,
          code: tableError.code
        })
      } else {
        testResults.push({
          test: 'questions 表格檢查',
          success: true,
          sampleData: tableInfo?.[0] || null,
          columns: tableInfo?.[0] ? Object.keys(tableInfo[0]) : []
        })
      }
    } catch (e: any) {
      testResults.push({
        test: 'questions 表格檢查',
        success: false,
        error: e.message
      })
    }

    // 測試 2：嘗試最簡單的插入
    console.log('測試 2: 嘗試最簡單的插入')
    const simpleQuestion = {
      question_text: '測試題目',
      option_a: '選項 A',
      option_b: '選項 B',
      option_c: '選項 C',
      option_d: '選項 D',
      correct_answer: 'A',
      points: 10,
      is_active: true
    }

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('questions')
        .insert([simpleQuestion])
        .select()

      if (insertError) {
        testResults.push({
          test: '簡單插入測試',
          success: false,
          error: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details
        })
      } else {
        testResults.push({
          test: '簡單插入測試',
          success: true,
          insertedData: insertData
        })

        // 清理測試資料
        if (insertData?.[0]?.id) {
          await supabase
            .from('questions')
            .delete()
            .eq('id', insertData[0].id)
        }
      }
    } catch (e: any) {
      testResults.push({
        test: '簡單插入測試',
        success: false,
        error: e.message
      })
    }

    // 測試 3：檢查 RLS 政策
    console.log('測試 3: 檢查 RLS 政策')
    try {
      const { data: policies, error: policyError } = await supabase
        .rpc('get_table_policies', { table_name: 'questions' })
        .single()

      testResults.push({
        test: 'RLS 政策檢查',
        success: !policyError,
        policies: policies || null,
        error: policyError?.message || null
      })
    } catch (e: any) {
      testResults.push({
        test: 'RLS 政策檢查',
        success: false,
        error: '無法檢查 RLS 政策: ' + e.message
      })
    }

    // 測試 4：檢查當前用戶權限
    console.log('測試 4: 檢查當前用戶權限')
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      testResults.push({
        test: '用戶權限檢查',
        success: !userError,
        user: userData?.user || null,
        error: userError?.message || null
      })
    } catch (e: any) {
      testResults.push({
        test: '用戶權限檢查',
        success: false,
        error: e.message
      })
    }

    console.log('=== 寫入權限測試結束 ===')

    return NextResponse.json({
      success: true,
      message: '寫入權限測試完成',
      testResults,
      summary: {
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.success).length,
        failedTests: testResults.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('寫入權限測試失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '寫入權限測試失敗', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
