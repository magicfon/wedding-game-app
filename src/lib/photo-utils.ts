'use client'

/**
 * 從可能是 Vercel 圖片優化 URL 中提取原始 Supabase URL
 * 
 * Vercel 優化 URL 格式: /_vercel/image?url={encodedUrl}&w=...
 * 如果是 Vercel 優化 URL，提取 url 參數
 * 如果已經是直接 URL，直接返回
 */
export function extractOriginalUrl(url: string | undefined | null): string | null {
    if (!url) return null

    // 檢查是否是 Vercel 圖片優化 URL
    if (url.includes('/_vercel/image') || url.includes('_vercel/image')) {
        try {
            // 找到 url= 參數
            const urlMatch = url.match(/[?&]url=([^&]+)/)
            if (urlMatch && urlMatch[1]) {
                // 解碼 URL
                return decodeURIComponent(urlMatch[1])
            }
        } catch (e) {
            console.warn('無法解析 Vercel 圖片 URL:', url, e)
        }
    }

    // 不是 Vercel 優化 URL，直接返回
    return url
}

/**
 * 獲取照片的最佳 URL，優先使用直接 Supabase URL
 * 這個函數會處理 Vercel 優化 URL，確保返回可用的 URL
 */
export function getPhotoUrl(
    photo: {
        image_url: string
        thumbnail_small_url?: string | null
        thumbnail_medium_url?: string | null
        thumbnail_large_url?: string | null
    },
    preferSize: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string {
    // 獲取候選 URLs
    const candidates = {
        original: photo.image_url,
        small: extractOriginalUrl(photo.thumbnail_small_url) || photo.image_url,
        medium: extractOriginalUrl(photo.thumbnail_medium_url) || photo.image_url,
        large: extractOriginalUrl(photo.thumbnail_large_url) || photo.image_url
    }

    // 根據偏好返回 URL
    return candidates[preferSize]
}
