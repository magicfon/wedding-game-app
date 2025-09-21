import { NextResponse } from 'next/server'

export async function GET() {
  // 只顯示環境變數是否存在，不顯示實際值（安全考量）
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key',
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // 顯示 URL 的前綴（安全）
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'Not set',
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    
    // 其他相關環境變數
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }

  return NextResponse.json({
    message: 'Environment variables status',
    status: envStatus,
    allEnvVarsSet: envStatus.NEXT_PUBLIC_SUPABASE_URL && envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}
