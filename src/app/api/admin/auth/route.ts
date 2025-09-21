import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // 檢查管理員密碼
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return NextResponse.json(
        { error: '系統配置錯誤' },
        { status: 500 }
      )
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: '密碼錯誤' },
        { status: 401 }
      )
    }

    // 生成 JWT token
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    const token = jwt.sign(
      { 
        role: 'admin',
        timestamp: Date.now()
      },
      jwtSecret,
      { expiresIn: '8h' } // 8小時過期
    )

    return NextResponse.json({
      success: true,
      token,
      expiresIn: '8h'
    })

  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

// 驗證管理員 token 的輔助函數
export function verifyAdminToken(token: string): boolean {
  try {
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    const decoded = jwt.verify(token, jwtSecret) as { role: string }
    return decoded.role === 'admin'
  } catch (error) {
    return false
  }
}
