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
        const failed: string[] = []

        // 收集所有需要預載的 URL（每張照片的所有可用縮圖）
        // 不同動畫模式使用不同的縮圖尺寸：
        // - FastShuffleLottery: thumbnail_large_url
        // - SlotMachineLottery/WaterfallLottery/TournamentLottery: thumbnail_medium_url
        // - SpiralLottery: thumbnail_small_url
        const urlsToPreload: string[] = []

        photos.forEach(photo => {
            if (useThumbnail) {
                // 預載所有可用的縮圖尺寸以支援所有動畫模式
                if (photo.thumbnail_small_url) urlsToPreload.push(photo.thumbnail_small_url)
                if (photo.thumbnail_medium_url) urlsToPreload.push(photo.thumbnail_medium_url)
                if (photo.thumbnail_large_url) urlsToPreload.push(photo.thumbnail_large_url)
                // 如果沒有任何縮圖，使用原圖
                if (!photo.thumbnail_small_url && !photo.thumbnail_medium_url && !photo.thumbnail_large_url) {
                    urlsToPreload.push(photo.image_url)
                }
            } else {
                urlsToPreload.push(photo.image_url)
            }
        })

        const total = urlsToPreload.length
        let loaded = 0

        setPreloadState({
            loaded: 0,
            total,
            progress: 0,
            complete: false,
            failed: []
        })

        console.log(`🖼️ 開始預載 ${total} 個圖片 URL（${photos.length} 張照片，多種尺寸）...`)

        // 使用 Promise.allSettled 並行載入，但限制並發數
        const concurrency = 8 // 提高並發數因為現在有更多 URL
        const batches: string[][] = []

        for (let i = 0; i < urlsToPreload.length; i += concurrency) {
            batches.push(urlsToPreload.slice(i, i + concurrency))
        }

        for (const batch of batches) {
            if (abortRef.current) break

            await Promise.allSettled(
                batch.map(url => {
                    return new Promise<void>((resolve) => {
                        const img = new Image()

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
