import { NextRequest, NextResponse } from 'next/server'

// 測試用圖片API端點，用於 lightbox 漸進式載入測試
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const width = searchParams.get('w') || '1200'
  
  // 使用一個公開的測試圖片
  const imageUrl = "https://picsum.photos/800/600?random=1"
  
  // 根據寬度參數返回不同尺寸的圖片
  return NextResponse.redirect(`${imageUrl}&width=${width}`)
}