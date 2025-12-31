'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '@/components/Layout'
import { X, Heart, Image as ImageIcon } from 'lucide-react'

interface WeddingPhoto {
    id: string
    name: string
    url: string
    thumbnailUrl: string
}

interface PhotoWithLayout extends WeddingPhoto {
    width: number
    height: number
    isLandscape: boolean
    loaded: boolean
    // Masonry position
    x?: number
    y?: number
    displayWidth?: number
    displayHeight?: number
}

// 計算欄位數量
const getColumnCount = (containerWidth: number): number => {
    if (containerWidth < 480) return 2
    if (containerWidth < 768) return 3
    if (containerWidth < 1024) return 4
    return 5
}

export default function WeddingPhotosPage() {
    const [photos, setPhotos] = useState<PhotoWithLayout[]>([])
    const [layoutPhotos, setLayoutPhotos] = useState<PhotoWithLayout[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithLayout | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [containerWidth, setContainerWidth] = useState(0)
    const [containerHeight, setContainerHeight] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const loadedCountRef = useRef(0)

    // 獲取婚紗照片
    const fetchPhotos = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/wedding-photos')
            const data = await response.json()

            if (data.success) {
                setPhotos(data.photos.map((p: WeddingPhoto) => ({
                    ...p,
                    width: 0,
                    height: 0,
                    isLandscape: false,
                    loaded: false
                })))
            } else {
                setError(data.error || '無法載入照片')
            }
        } catch (err) {
            console.error('Error fetching wedding photos:', err)
            setError('載入照片時發生錯誤')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPhotos()
    }, [fetchPhotos])

    // 監聽容器寬度變化
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth)
            }
        }

        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    // 處理圖片載入，獲取真實尺寸
    const handleImageLoad = useCallback((photoId: string, img: HTMLImageElement) => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        const isLandscape = width > height

        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, width, height, isLandscape, loaded: true } : p
        ))
        loadedCountRef.current += 1
    }, [])

    // Masonry 佈局計算
    useEffect(() => {
        if (containerWidth === 0) return

        const loadedPhotos = photos.filter(p => p.loaded)
        if (loadedPhotos.length === 0) return

        const gap = 8 // 間距
        const columnCount = getColumnCount(containerWidth)
        const columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount

        // 每欄的當前高度
        const columnHeights: number[] = Array(columnCount).fill(0)

        // 計算每張照片的位置
        const positioned = loadedPhotos.map(photo => {
            // 橫式照片佔 2 欄（但不能超過總欄數）
            const colSpan = photo.isLandscape && columnCount >= 2 ? 2 : 1
            const itemWidth = columnWidth * colSpan + gap * (colSpan - 1)
            const aspectRatio = photo.height / photo.width
            const itemHeight = itemWidth * aspectRatio

            // 找到最矮的連續欄位來放置
            let bestColumn = 0
            let bestHeight = Infinity

            for (let i = 0; i <= columnCount - colSpan; i++) {
                // 對於跨欄項目，取最高的欄位高度
                let maxHeight = 0
                for (let j = 0; j < colSpan; j++) {
                    maxHeight = Math.max(maxHeight, columnHeights[i + j])
                }
                if (maxHeight < bestHeight) {
                    bestHeight = maxHeight
                    bestColumn = i
                }
            }

            const x = bestColumn * (columnWidth + gap)
            const y = bestHeight

            // 更新被佔用欄位的高度
            for (let j = 0; j < colSpan; j++) {
                columnHeights[bestColumn + j] = y + itemHeight + gap
            }

            return {
                ...photo,
                x,
                y,
                displayWidth: itemWidth,
                displayHeight: itemHeight
            }
        })

        setLayoutPhotos(positioned)
        setContainerHeight(Math.max(...columnHeights))
    }, [photos, containerWidth])

    if (loading) {
        return (
            <Layout title="婚紗照">
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                </div>
            </Layout>
        )
    }

    if (error) {
        return (
            <Layout title="婚紗照">
                <div className="text-center py-16">
                    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">載入失敗</h3>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={fetchPhotos}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                        >
                            重試
                        </button>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="婚紗照">
            <div className="max-w-6xl mx-auto px-2 sm:px-4">
                {/* 頂部標題 */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">💕 婚紗照</h2>
                            <span className="bg-pink-100 text-pink-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                                {photos.length} 張照片
                            </span>
                        </div>
                    </div>
                </div>

                {/* 照片牆 - True Masonry Layout */}
                {photos.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有照片</h3>
                            <p className="text-gray-600">婚紗照即將上傳，敬請期待！</p>
                        </div>
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        className="relative"
                        style={{ height: containerHeight || 'auto', minHeight: 200 }}
                    >
                        {/* 隱藏的預載入圖片，用於獲取尺寸 */}
                        {photos.filter(p => !p.loaded).map(photo => (
                            <img
                                key={`preload-${photo.id}`}
                                src={photo.thumbnailUrl}
                                alt=""
                                className="absolute opacity-0 pointer-events-none"
                                style={{ width: 1, height: 1 }}
                                onLoad={(e) => handleImageLoad(photo.id, e.currentTarget)}
                            />
                        ))}

                        {/* 實際渲染的照片 */}
                        {layoutPhotos.map((photo) => (
                            <div
                                key={photo.id}
                                className="absolute cursor-pointer group transition-all duration-300"
                                style={{
                                    left: photo.x,
                                    top: photo.y,
                                    width: photo.displayWidth,
                                    height: photo.displayHeight
                                }}
                                onClick={() => setSelectedPhoto(photo)}
                            >
                                <div className="w-full h-full bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                    <img
                                        src={photo.thumbnailUrl}
                                        alt={photo.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 照片放大檢視 */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <img
                        src={selectedPhoto.url}
                        alt={selectedPhoto.name}
                        className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </Layout>
    )
}
