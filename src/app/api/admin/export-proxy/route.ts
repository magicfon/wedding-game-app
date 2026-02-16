import { NextRequest, NextResponse } from 'next/server'

// 代理下載圖片（解決 CORS 問題）
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url')
    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        })

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch: ${response.status}` }, { status: response.status })
        }

        const buffer = await response.arrayBuffer()
        const contentType = response.headers.get('content-type') || 'image/jpeg'

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Proxy fetch failed' },
            { status: 500 }
        )
    }
}
