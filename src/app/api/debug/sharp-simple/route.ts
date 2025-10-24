import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 測試 Sharp 庫基本導入
    let sharp
    try {
      sharp = (await import('sharp')).default || (await import('sharp'))
      return NextResponse.json({
        success: true,
        message: 'Sharp 庫成功導入',
        version: sharp.versions || 'unknown',
        available: true
      })
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Sharp 庫導入失敗',
        error: error instanceof Error ? error.message : '未知錯誤',
        available: false
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: '調試過程中發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}