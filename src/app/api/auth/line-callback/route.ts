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

    // 4. 返回用戶資料（資料庫同步由 LIFF hook 的 liff-sync API 處理）
    console.log('Line user authenticated:', {
      userId: userData.line_id,
      displayName: userData.display_name
    })

    return NextResponse.json({
      success: true,
      user: {
        line_id: userData.line_id,
        display_name: userData.display_name,
        avatar_url: userData.avatar_url,
      },
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Line callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
