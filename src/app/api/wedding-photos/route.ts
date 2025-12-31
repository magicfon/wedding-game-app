import { NextResponse } from 'next/server'

// Google Drive 資料夾 ID
const FOLDER_ID = '1ONhhVIoewh3he9mT4ie0llGi_urQh5Kw'

// 將 Google Drive 檔案 ID 轉換為大圖連結 (使用 thumbnail 格式，更可靠)
function getDirectImageUrl(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`
}

// 取得縮圖 URL (較小尺寸，載入更快)
function getThumbnailUrl(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
}

export async function GET() {
    try {
        // 使用 Google Drive 的公開連結抓取資料夾內容
        // 這個方法利用 Google Drive 的 embed 功能來獲取檔案列表
        const folderUrl = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#grid`

        const response = await fetch(folderUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!response.ok) {
            throw new Error('無法存取 Google Drive 資料夾')
        }

        const html = await response.text()

        // 從 HTML 中提取檔案 ID
        // Google Drive embed view 中的檔案 ID 格式
        const fileIdRegex = /data-id="([a-zA-Z0-9_-]+)"/g
        const fileIds: string[] = []
        let match

        while ((match = fileIdRegex.exec(html)) !== null) {
            if (match[1] && !fileIds.includes(match[1]) && match[1] !== FOLDER_ID) {
                fileIds.push(match[1])
            }
        }

        // 另一種匹配模式：從 image src 中提取
        const imgSrcRegex = /\/d\/([a-zA-Z0-9_-]+)\//g
        while ((match = imgSrcRegex.exec(html)) !== null) {
            if (match[1] && !fileIds.includes(match[1]) && match[1] !== FOLDER_ID) {
                fileIds.push(match[1])
            }
        }

        // 建立照片列表
        const photos = fileIds.map((id, index) => ({
            id,
            name: `婚紗照 ${index + 1}`,
            url: getDirectImageUrl(id),
            thumbnailUrl: getThumbnailUrl(id)
        }))

        return NextResponse.json({
            success: true,
            photos,
            count: photos.length
        })

    } catch (error) {
        console.error('Error fetching wedding photos:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '載入照片失敗',
            photos: []
        }, { status: 500 })
    }
}
