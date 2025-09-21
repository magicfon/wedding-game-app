import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await request.json()
    
    if (!profile || !profile.userId || !profile.displayName) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: 'Missing userId or displayName' },
        { status: 400 }
      )
    }

    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        error: 'Database not configured',
        details: 'NEXT_PUBLIC_SUPABASE_URL not set',
        hint: 'Please set Supabase environment variables in Vercel'
      }, { status: 500 })
    }
    
    if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
      return NextResponse.json({
        error: 'Database not configured', 
        details: 'NEXT_PUBLIC_SUPABASE_ANON_KEY not set',
        hint: 'Please set Supabase environment variables in Vercel'
      }, { status: 500 })
    }

    const supabase = await createSupabaseServer()

    // 檢查用戶是否已存在
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('line_id', profile.userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError)
      return NextResponse.json({
        error: 'Database connection failed',
        details: fetchError.message,
        hint: fetchError.message.includes('relation "users" does not exist') 
          ? 'Please run database/setup.sql in Supabase SQL Editor'
          : 'Check your database configuration'
      }, { status: 500 })
    }

    let userData
    
    if (existingUser) {
      // 更新現有用戶
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('line_id', profile.userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        )
      }

      userData = updatedUser
    } else {
      // 創建新用戶
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          line_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      userData = newUser
    }

    return NextResponse.json({
      success: true,
      user: userData,
      isNewUser: !existingUser
    })

  } catch (error) {
    console.error('LIFF sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
