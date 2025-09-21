import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const results = {
    step1_env_check: false,
    step2_client_creation: false,
    step3_connection_test: false,
    step4_table_check: false,
    step5_insert_test: false,
    errors: [] as string[],
    details: {} as any
  }

  try {
    // 步驟 1: 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    results.details.supabaseUrl = supabaseUrl
    results.details.keyLength = supabaseAnonKey?.length || 0
    results.details.urlValid = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && supabaseUrl.includes('.supabase.co')
    results.details.keyValid = supabaseAnonKey && supabaseAnonKey !== 'placeholder-key' && supabaseAnonKey.length > 100
    
    if (!results.details.urlValid || !results.details.keyValid) {
      results.errors.push('環境變數配置不正確')
      return NextResponse.json(results)
    }
    results.step1_env_check = true

    // 步驟 2: 創建 Supabase 客戶端
    const supabase = await createSupabaseServer()
    results.step2_client_creation = true

    // 步驟 3: 測試基本連接
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(0)
    
    if (connectionError) {
      results.errors.push(`連接錯誤: ${connectionError.message}`)
      results.details.connectionError = connectionError
      return NextResponse.json(results)
    }
    results.step3_connection_test = true

    // 步驟 4: 檢查表格結構
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('line_id, display_name, created_at')
      .limit(1)
    
    if (tableError) {
      results.errors.push(`表格檢查錯誤: ${tableError.message}`)
      results.details.tableError = tableError
      return NextResponse.json(results)
    }
    results.step4_table_check = true
    results.details.existingUsers = tableCheck?.length || 0

    // 步驟 5: 測試插入（使用測試數據）
    const testUserId = 'test_user_' + Date.now()
    const { data: insertTest, error: insertError } = await supabase
      .from('users')
      .insert({
        line_id: testUserId,
        display_name: '測試用戶',
        picture_url: null
      })
      .select()
      .single()

    if (insertError) {
      results.errors.push(`插入測試錯誤: ${insertError.message}`)
      results.details.insertError = insertError
      return NextResponse.json(results)
    }

    // 清理測試數據
    await supabase.from('users').delete().eq('line_id', testUserId)
    
    results.step5_insert_test = true
    results.details.insertTestData = insertTest

    return NextResponse.json({
      ...results,
      success: true,
      message: '所有測試通過！資料庫配置正確。'
    })

  } catch (error) {
    results.errors.push(`未預期錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    return NextResponse.json(results)
  }
}
