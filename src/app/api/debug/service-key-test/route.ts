import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== 服務密鑰測試開始 ===')
    
    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Supabase URL:', supabaseUrl ? '已設置' : '未設置')
    console.log('Service Key:', serviceKey ? `已設置 (${serviceKey.substring(0, 20)}...)` : '未設置')
    
    if (!serviceKey) {
      return NextResponse.json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY 環境變數未設置',
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceKey: !!serviceKey
        }
      })
    }
    
    // 嘗試創建管理員客戶端
    let supabase
    try {
      supabase = createSupabaseAdmin()
      console.log('管理員客戶端創建成功')
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: '無法創建管理員客戶端',
        details: error.message
      })
    }
    
    // 測試插入操作
    const testQuestion = {
      question_text: '服務密鑰測試題目',
      option_a: '選項 A',
      option_b: '選項 B', 
      option_c: '選項 C',
      option_d: '選項 D',
      correct_answer: 'A',
      points: 10,
      is_active: true
    }
    
    console.log('嘗試插入測試資料...')
    const { data: insertData, error: insertError } = await supabase
      .from('questions')
      .insert([testQuestion])
      .select()
    
    if (insertError) {
      console.error('插入失敗:', insertError)
      return NextResponse.json({
        success: false,
        error: '插入操作失敗',
        supabaseError: {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details
        }
      })
    }
    
    console.log('插入成功:', insertData)
    
    // 清理測試資料
    if (insertData?.[0]?.id) {
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('id', insertData[0].id)
      
      if (deleteError) {
        console.warn('清理測試資料失敗:', deleteError)
      } else {
        console.log('測試資料已清理')
      }
    }
    
    console.log('=== 服務密鑰測試成功 ===')
    
    return NextResponse.json({
      success: true,
      message: '服務密鑰測試成功！可以正常插入資料',
      testData: {
        insertedId: insertData?.[0]?.id,
        cleaned: true
      }
    })
    
  } catch (error) {
    console.error('服務密鑰測試失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服務密鑰測試失敗', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
