import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Environment variables check started')
    
    // 檢查所有相關的環境變數
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID,
      NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
      LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    }

    console.log('Environment variables status:')
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`- ${key}:`, value ? 'SET' : 'MISSING')
      if (value && key.includes('URL')) {
        console.log(`  Value: ${value.substring(0, 50)}...`)
      }
    })

    // 檢查 Supabase URL 格式
    const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
    let urlValid = false
    let urlIssues = []

    if (supabaseUrl) {
      if (supabaseUrl === 'https://placeholder.supabase.co') {
        urlIssues.push('Using placeholder URL')
      } else if (!supabaseUrl.includes('.supabase.co')) {
        urlIssues.push('URL does not contain .supabase.co')
      } else if (!supabaseUrl.startsWith('https://')) {
        urlIssues.push('URL does not start with https://')
      } else {
        urlValid = true
      }
    } else {
      urlIssues.push('URL is missing')
    }

    // 檢查 Supabase Key 格式
    const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let keyValid = false
    let keyIssues = []

    if (supabaseKey) {
      if (supabaseKey === 'placeholder-key') {
        keyIssues.push('Using placeholder key')
      } else if (supabaseKey.length < 100) {
        keyIssues.push('Key seems too short (should be ~100+ characters)')
      } else if (!supabaseKey.startsWith('eyJ')) {
        keyIssues.push('Key does not start with eyJ (JWT format)')
      } else {
        keyValid = true
      }
    } else {
      keyIssues.push('Key is missing')
    }

    const result = {
      success: true,
      message: 'Environment check completed',
      environment: {
        nodeEnv: envVars.NODE_ENV,
        isVercel: !!envVars.VERCEL,
        vercelEnv: envVars.VERCEL_ENV
      },
      supabase: {
        url: {
          exists: !!supabaseUrl,
          valid: urlValid,
          issues: urlIssues,
          preview: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : null
        },
        key: {
          exists: !!supabaseKey,
          valid: keyValid,
          issues: keyIssues,
          length: supabaseKey ? supabaseKey.length : 0
        }
      },
      otherVars: {
        appUrl: !!envVars.NEXT_PUBLIC_APP_URL,
        lineChannelId: !!envVars.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID,
        liffId: !!envVars.NEXT_PUBLIC_LIFF_ID,
        lineAccessToken: !!envVars.LINE_CHANNEL_ACCESS_TOKEN,
        lineSecret: !!envVars.LINE_CHANNEL_SECRET
      }
    }

    console.log('Environment check result:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('💥 Environment check failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
