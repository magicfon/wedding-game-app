import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({ error: '需要提供 URL 參數' }, { status: 400 })
    }

    // 生成 QR code 為 data URL
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    return NextResponse.json({ 
      success: true, 
      qrCode: qrCodeDataURL,
      qrCodeDataURL 
    })

  } catch (error) {
    console.error('QR Code generation error:', error)
    return NextResponse.json({ error: 'QR Code 生成失敗' }, { status: 500 })
  }
}
