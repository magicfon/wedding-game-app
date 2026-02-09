import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import archiver from 'archiver'
import { PassThrough } from 'stream'

interface PhotoData {
    id: number
    image_url: string
    blessing_message: string | null
    is_public: boolean
    vote_count: number
    created_at: string
    media_type?: 'image' | 'video'
    uploader: {
        display_name: string
        avatar_url: string | null
    }
}

function generateHtmlContent(photos: PhotoData[], generatedAt: string): string {
    const photoCards = photos.map((photo, index) => {
        const filename = `photo_${String(index + 1).padStart(3, '0')}.${photo.media_type === 'video' ? 'mp4' : 'jpg'}`
        const uploadTime = new Date(photo.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        const blessing = photo.blessing_message || '（無祝福語）'
        const mediaType = photo.media_type === 'video' ? '影片' : '照片'
        const visibility = photo.is_public ? '公開' : '隱私'

        return `
      <div class="card">
        <a href="photos/${filename}" target="_blank" class="media-container">
          ${photo.media_type === 'video'
                ? `<video src="photos/${filename}" class="media"></video><div class="video-badge">▶ 影片</div>`
                : `<img src="photos/${filename}" alt="${photo.uploader.display_name}" class="media">`
            }
        </a>
        <div class="info">
          <div class="uploader">
            <span class="avatar">👤</span>
            <span class="name">${escapeHtml(photo.uploader.display_name)}</span>
          </div>
          <div class="meta">
            <span class="time">🕐 ${uploadTime}</span>
            <span class="votes">❤️ ${photo.vote_count} 票</span>
            <span class="type ${photo.media_type === 'video' ? 'video' : 'image'}">${mediaType}</span>
            <span class="visibility ${photo.is_public ? 'public' : 'private'}">${visibility}</span>
          </div>
          <div class="blessing">
            <div class="blessing-label">💬 祝福語</div>
            <div class="blessing-text">${escapeHtml(blessing)}</div>
          </div>
        </div>
      </div>`
    }).join('\n')

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>婚禮照片與祝福語紀錄</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 40px 20px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .header p { color: #666; }
    .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
    }
    .stat {
      background: #f8f9fa;
      padding: 15px 25px;
      border-radius: 12px;
    }
    .stat-value { font-size: 1.5rem; font-weight: bold; color: #ec4899; }
    .stat-label { font-size: 0.9rem; color: #666; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    }
    .media-container {
      display: block;
      position: relative;
      aspect-ratio: 1;
      background: #f3f4f6;
    }
    .media {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .video-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.6);
      color: white;
      padding: 10px 20px;
      border-radius: 30px;
      font-weight: bold;
    }
    .info { padding: 16px; }
    .uploader {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .avatar { font-size: 1.2rem; }
    .name { font-weight: 600; color: #333; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 0.85rem;
    }
    .meta span {
      background: #f3f4f6;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .type.video { background: #fee2e2; color: #dc2626; }
    .type.image { background: #dbeafe; color: #2563eb; }
    .visibility.public { background: #d1fae5; color: #059669; }
    .visibility.private { background: #ede9fe; color: #7c3aed; }
    .blessing {
      background: #fdf2f8;
      border-radius: 12px;
      padding: 12px;
    }
    .blessing-label {
      font-size: 0.85rem;
      color: #ec4899;
      margin-bottom: 6px;
    }
    .blessing-text {
      color: #4b5563;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💒 婚禮照片與祝福語</h1>
    <p>產生時間：${generatedAt}</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${photos.length}</div>
        <div class="stat-label">張照片/影片</div>
      </div>
      <div class="stat">
        <div class="stat-value">${photos.reduce((sum, p) => sum + p.vote_count, 0)}</div>
        <div class="stat-label">總投票數</div>
      </div>
      <div class="stat">
        <div class="stat-value">${photos.filter(p => p.blessing_message).length}</div>
        <div class="stat-label">則祝福語</div>
      </div>
    </div>
  </div>
  <div class="grid">
    ${photoCards}
  </div>
  <div class="footer">
    <p>🎊 感謝所有賓客的參與與祝福 🎊</p>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

export async function GET() {
    try {
        const supabaseAdmin = createSupabaseAdmin()

        // 獲取所有照片資料
        const { data: photos, error: photosError } = await supabaseAdmin
            .from('photos')
            .select(`
        id,
        image_url,
        blessing_message,
        is_public,
        vote_count,
        created_at,
        media_type,
        uploader:users!photos_user_id_fkey (
          display_name,
          avatar_url
        )
      `)
            .order('created_at', { ascending: false })

        if (photosError) {
            console.error('獲取照片失敗:', photosError)
            return NextResponse.json(
                { error: '獲取照片失敗', details: photosError.message },
                { status: 500 }
            )
        }

        if (!photos || photos.length === 0) {
            return NextResponse.json(
                { error: '沒有照片可下載' },
                { status: 404 }
            )
        }

        // 轉換資料格式（Supabase 回傳的 uploader 是陣列，需要取第一個元素）
        const transformedPhotos: PhotoData[] = photos.map(photo => ({
            id: photo.id,
            image_url: photo.image_url,
            blessing_message: photo.blessing_message,
            is_public: photo.is_public,
            vote_count: photo.vote_count,
            created_at: photo.created_at,
            media_type: photo.media_type as 'image' | 'video' | undefined,
            uploader: Array.isArray(photo.uploader)
                ? photo.uploader[0]
                : photo.uploader as { display_name: string; avatar_url: string | null }
        }))

        // 建立 ZIP 串流
        const archive = archiver('zip', { zlib: { level: 5 } })
        const passthrough = new PassThrough()

        archive.pipe(passthrough)

        // 下載每張照片並加入 ZIP
        for (let i = 0; i < transformedPhotos.length; i++) {
            const photo = transformedPhotos[i]
            const extension = photo.media_type === 'video' ? 'mp4' : 'jpg'
            const filename = `photo_${String(i + 1).padStart(3, '0')}.${extension}`

            try {
                const response = await fetch(photo.image_url)
                if (response.ok) {
                    const buffer = await response.arrayBuffer()
                    archive.append(Buffer.from(buffer), { name: `photos/${filename}` })
                }
            } catch (err) {
                console.warn(`下載照片 ${photo.id} 失敗:`, err)
            }
        }

        // 產生 HTML 檔案
        const generatedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        const htmlContent = generateHtmlContent(transformedPhotos, generatedAt)
        archive.append(htmlContent, { name: 'index.html' })

        // 完成打包
        archive.finalize()

        // 回傳串流
        const timestamp = new Date().toISOString().split('T')[0]

        return new NextResponse(passthrough as unknown as ReadableStream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="wedding-photos-${timestamp}.zip"`,
            },
        })

    } catch (error) {
        console.error('下載照片失敗:', error)
        return NextResponse.json(
            { error: '伺服器錯誤' },
            { status: 500 }
        )
    }
}
