'use client'

import { useState, useCallback, useRef } from 'react'

interface Photo {
    id: number
    image_url: string
    thumbnail_small_url?: string
    thumbnail_medium_url?: string
    thumbnail_large_url?: string
}

interface PreloadResult {
    loaded: number
    total: number
    progress: number
    complete: boolean
    failed: string[]
}

export function usePhotoPreloader() {
    const [preloadState, setPreloadState] = useState<PreloadResult>({
        loaded: 0,
        total: 0,
        progress: 0,
        complete: false,
        failed: []
    })

    const abortRef = useRef(false)

    const preloadPhotos = useCallback(async (
        photos: Photo[],
        options: {
            useThumbnail?: boolean
            onProgress?: (progress: number) => void
        } = {}
    ): Promise<boolean> => {
        const { useThumbnail = true, onProgress } = options

        if (photos.length === 0) {
            setPreloadState({
                loaded: 0,
                total: 0,
                progress: 100,
                complete: true,
                failed: []
            })
            return true
        }

        abortRef.current = false
        const total = photos.length
        let loaded = 0
        const failed: string[] = []

        setPreloadState({
            loaded: 0,
            total,
            progress: 0,
            complete: false,
            failed: []
        })

        console.log(`🖼️ 開始預載 ${total} 張照片...`)

        // 使用 Promise.allSettled 並行載入，但限制並發數
        const concurrency = 5
        const batches: Photo[][] = []

        for (let i = 0; i < photos.length; i += concurrency) {
            batches.push(photos.slice(i, i + concurrency))
        }

        for (const batch of batches) {
            if (abortRef.current) break

            await Promise.allSettled(
                batch.map(photo => {
                    return new Promise<void>((resolve) => {
                        const img = new Image()

                        // 選擇要預載的 URL（優先使用縮圖）
                        const url = useThumbnail
                            ? (photo.thumbnail_medium_url || photo.thumbnail_large_url || photo.image_url)
                            : photo.image_url

                        img.onload = () => {
                            loaded++
                            const progress = Math.round((loaded / total) * 100)
                            setPreloadState(prev => ({
                                ...prev,
                                loaded,
                                progress,
                                complete: loaded >= total
                            }))
                            onProgress?.(progress)
                            resolve()
                        }

                        img.onerror = () => {
                            loaded++
                            failed.push(url)
                            const progress = Math.round((loaded / total) * 100)
                            setPreloadState(prev => ({
                                ...prev,
                                loaded,
                                progress,
                                failed: [...prev.failed, url],
                                complete: loaded >= total
                            }))
                            onProgress?.(progress)
                            resolve()
                        }

                        img.src = url
                    })
                })
            )
        }

        const success = failed.length === 0
        console.log(`🖼️ 預載完成: ${loaded}/${total} 成功${failed.length > 0 ? `, ${failed.length} 失敗` : ''}`)

        setPreloadState(prev => ({
            ...prev,
            complete: true
        }))

        return success
    }, [])

    const abort = useCallback(() => {
        abortRef.current = true
    }, [])

    const reset = useCallback(() => {
        abortRef.current = false
        setPreloadState({
            loaded: 0,
            total: 0,
            progress: 0,
            complete: false,
            failed: []
        })
    }, [])

    return {
        preloadState,
        preloadPhotos,
        abort,
        reset
    }
}
