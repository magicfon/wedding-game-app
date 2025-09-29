import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

interface LineTokenResponse {
  access_token: string
  token_type: string
  refresh_token: string
  expires_in: number
  scope: string
  id_token?: string
}

interface LineProfileResponse {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    // 1. 用授權碼交換 access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/line`,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID || '',
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET || '',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Line token exchange failed:', errorText)
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 })
    }

    const tokenData: LineTokenResponse = await tokenResponse.json()

    // 2. 用 access token 獲取用戶資料
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error('Line profile fetch failed:', errorText)
      return NextResponse.json({ error: 'Profile fetch failed' }, { status: 400 })
    }

    const profileData: LineProfileResponse = await profileResponse.json()

    // 3. 整理用戶資料
    const userData = {
      line_id: profileData.userId,
      display_name: profileData.displayName,
      avatar_url: profileData.pictureUrl || '',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    }

    // 4. 將用戶資料儲存到 Supabase 並創建 session
    const supabase = createSupabaseAdmin()
    
    try {
      // 檢查用戶是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('line_id', userData.line_id)
        .single()

      if (!existingUser) {
        // 創建新用戶
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            line_id: userData.line_id,
            display_name: userData.display_name,
            avatar_url: userData.avatar_url,
            total_score: 0,
            is_active: true
          })

        if (insertError) {
          console.error('Error creating user:', insertError)
        }
      } else {
        // 更新現有用戶資料
        const { error: updateError } = await supabase
          .from('users')
          .update({
            display_name: userData.display_name,
            avatar_url: userData.avatar_url,
            is_active: true
          })
          .eq('line_id', userData.line_id)

        if (updateError) {
          console.error('Error updating user:', updateError)
        }
      }

      // 創建 Supabase Auth 用戶 (使用 Line ID 作為唯一標識)
      const email = `${userData.line_id}@line.local`
      const password = userData.line_id // 使用 Line ID 作為密碼

      // 嘗試創建或登入 Supabase Auth 用戶
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          line_id: userData.line_id,
          full_name: userData.display_name,
          avatar_url: userData.avatar_url,
          provider: 'line'
        },
        email_confirm: true
      })

      if (authError && !authError.message.includes('already registered')) {
        console.error('Error creating Supabase auth user:', authError)
      }

      console.log('Line user authenticated and stored:', {
        userId: userData.line_id,
        displayName: userData.display_name,
        supabaseUserId: authData?.user?.id
      })

      return NextResponse.json({
        success: true,
        user: {
          line_id: userData.line_id,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url,
        },
        auth: {
          email,
          password // 前端需要這個來登入 Supabase
        },
        message: 'Login successful'
      })

    } catch (error) {
      console.error('Error handling Supabase integration:', error)
      
      // 即使 Supabase 整合失敗，仍然返回成功的 Line 登入
      return NextResponse.json({
        success: true,
        user: {
          line_id: userData.line_id,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url,
        },
        message: 'Login successful (Supabase integration failed)'
      })
    }

  } catch (error) {
    console.error('Line callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
