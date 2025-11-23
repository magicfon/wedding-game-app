import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 管理員密碼驗證
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'

function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === ADMIN_PASSWORD
}

// 生成 Vercel Image Optimization URL
function generateVercelImageUrl(baseUrl: string, width: number, quality: number = 80, format: string = 'auto'): string {
  const encodedUrl = encodeURIComponent(baseUrl)
  return `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=${format}`
}

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    if (!verifyAdmin(request)) {
      return NextResponse.json({
        error: '未授權存取'
      }, { status: 401 })
    }

    const { photoId, action } = await request.json()

    if (!photoId || !action) {
      return NextResponse.json({
        error: '缺少必要參數'
      }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    if (action === 'refresh') {
      // 重新生成指定照片的縮圖 URL
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('image_url')
        .eq('id', photoId)
        .single()

      if (fetchError) {
        return NextResponse.json({
          error: '找不到指定照片',
          details: fetchError.message
        }, { status: 404 })
      }

      // 生成新的縮圖 URL
      const thumbnailUrls = {
        thumbnail_url_template: photo.image_url,
        thumbnail_small_url: generateVercelImageUrl(photo.image_url, 200, 75, 'auto'),
        thumbnail_medium_url: generateVercelImageUrl(photo.image_url, 400, 80, 'auto'),
        thumbnail_large_url: generateVercelImageUrl(photo.image_url, 800, 85, 'auto'),
        thumbnail_generated_at: new Date().toISOString()
      }

      // 更新資料庫
      const { data: updatedPhoto, error: updateError } = await supabase
        .from('photos')
        .update(thumbnailUrls)
        .eq('id', photoId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({
          error: '更新縮圖 URL 失敗',
          details: updateError.message
        }, { status: 500 })
      }

      console.log(`✅ 照片 ${photoId} 縮圖 URL 已更新`)

      return NextResponse.json({
        success: true,
        message: '縮圖 URL 更新成功',
        data: {
          photoId,
          thumbnailUrls,
          updatedPhoto
        }
      })

    } else if (action === 'batch-refresh') {
      // 批量重新生成所有照片的縮圖 URL
      const { data: photos, error: fetchError } = await supabase
        .from('photos')
        .select('id, image_url')
        .not('image_url', 'is', null)

      if (fetchError) {
        return NextResponse.json({
          error: '獲取照片列表失敗',
          details: fetchError.message
        }, { status: 500 })
      }

      let successCount = 0
      let errorCount = 0
      const errors: any[] = []

      // 批量更新
      for (const photo of photos) {
        try {
          const thumbnailUrls = {
            thumbnail_url_template: photo.image_url,
            thumbnail_small_url: generateVercelImageUrl(photo.image_url, 200, 75, 'auto'),
            thumbnail_medium_url: generateVercelImageUrl(photo.image_url, 400, 80, 'auto'),
            thumbnail_large_url: generateVercelImageUrl(photo.image_url, 800, 85, 'auto'),
            thumbnail_generated_at: new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('photos')
            .update(thumbnailUrls)
            .eq('id', photo.id)

          if (updateError) {
            errors.push({
              photoId: photo.id,
              error: updateError.message
            })
            errorCount++
          } else {
            successCount++
          }
        } catch (error) {
          errors.push({
            photoId: photo.id,
            error: error instanceof Error ? error.message : '未知錯誤'
          })
          errorCount++
        }
      }

      console.log(`✅ 批量更新完成: ${successCount} 成功, ${errorCount} 失敗`)

      return NextResponse.json({
        success: true,
        message: '批量縮圖 URL 更新完成',
        data: {
          totalPhotos: photos.length,
          successCount,
          errorCount,
          errors: errors.slice(0, 10) // 只返回前 10 個錯誤
        }
      })

    } else {
      return NextResponse.json({
        error: '不支援的操作'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ 縮圖管理錯誤:', error)
    return NextResponse.json({
      error: '伺服器錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    if (!verifyAdmin(request)) {
      return NextResponse.json({
        error: '未授權存取'
      }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()

    // 獲取縮圖統計資訊
    const { data: stats, error: statsError } = await supabase
      .from('photos')
      .select('id, thumbnail_generated_at, image_url')
      .not('image_url', 'is', null)

    if (statsError) {
      return NextResponse.json({
        error: '獲取統計資訊失敗',
        details: statsError.message
      }, { status: 500 })
    }

    const totalPhotos = stats.length
    const photosWithThumbnails = stats.filter(p => p.thumbnail_generated_at).length
    const photosWithoutThumbnails = totalPhotos - photosWithThumbnails

    return NextResponse.json({
      success: true,
      data: {
        totalPhotos,
        photosWithThumbnails,
        photosWithoutThumbnails,
        thumbnailCoverage: totalPhotos > 0 ? (photosWithThumbnails / totalPhotos * 100).toFixed(2) + '%' : '0%'
      }
    })

  } catch (error) {
    console.error('❌ 獲取縮圖統計錯誤:', error)
    return NextResponse.json({
      error: '伺服器錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}