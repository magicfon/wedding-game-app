import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Basic API test started')
    
    // 測試環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Environment variables:')
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_KEY exists:', !!supabaseKey)
    console.log('- SUPABASE_URL value:', supabaseUrl?.substring(0, 30) + '...')
    
    return NextResponse.json({
      success: true,
      message: 'Basic API test successful',
      environment: {
        supabaseUrl: supabaseUrl ? 'configured' : 'missing',
        supabaseKey: supabaseKey ? 'configured' : 'missing',
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('💥 Basic API test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Basic API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Basic POST test started')
    
    const body = await request.json()
    console.log('📋 Received body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'POST test successful',
      receivedData: body,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Basic POST test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'POST test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
