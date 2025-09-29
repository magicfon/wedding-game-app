import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    // 檢查 photos 表格結構
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'photos' })
    
    if (tableError) {
      console.error('無法獲取表格資訊:', tableError)
      
      // 嘗試直接查詢表格結構
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'photos')
        .eq('table_schema', 'public')
      
      if (columnsError) {
        return NextResponse.json({
          error: '無法檢查 photos 表格結構',
          details: columnsError.message
        }, { status: 500 })
      }
      
      return NextResponse.json({
        message: 'Photos 表格結構檢查',
        columns,
        tableError: tableError.message
      })
    }
    
    // 檢查是否有資料
    const { data: sampleData, error: dataError } = await supabase
      .from('photos')
      .select('*')
      .limit(1)
    
    // 檢查 users 表格是否存在測試用戶
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('line_id, display_name')
      .limit(5)
    
    return NextResponse.json({
      message: 'Photos 表格檢查完成',
      tableInfo,
      sampleData: sampleData || [],
      dataError: dataError?.message,
      users: users || [],
      usersError: usersError?.message
    })
    
  } catch (error) {
    console.error('檢查 photos 表格錯誤:', error)
    return NextResponse.json({
      error: '檢查失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
