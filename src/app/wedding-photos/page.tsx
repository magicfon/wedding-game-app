'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { X, Heart, Image as ImageIcon } from 'lucide-react'
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns'

interface WeddingPhoto {
    id: string
    name: string
    url: string
    thumbnailUrl: string
}

export default function WeddingPhotosPage() {
    const [photos, setPhotos] = useState<WeddingPhoto[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState<WeddingPhoto | null>(null)
    const [error, setError] = useState<string | null>(null)

    const { columnCount } = useResponsiveColumns()

    // 獲取婚紗照片
    const fetchPhotos = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/wedding-photos')
            const data = await response.json()

            if (data.success) {
                setPhotos(data.photos)
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

    // 分配照片到各列（瀑布流佈局）
    const distributePhotosToColumns = (photos: WeddingPhoto[], columnCount: number): WeddingPhoto[][] => {
        const columns: WeddingPhoto[][] = Array.from({ length: columnCount }, () => [])
        photos.forEach((photo, index) => {
            columns[index % columnCount].push(photo)
        })
        return columns
    }

    const columns = distributePhotosToColumns(photos, columnCount)

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
            <div className="max-w-6xl mx-auto">
                {/* 頂部標題 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-2xl font-bold text-gray-800">💕 婚紗照</h2>
                            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                                {photos.length} 張照片
                            </span>
                        </div>
                    </div>
                </div>

                {/* 照片牆 */}
                {photos.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有照片</h3>
                            <p className="text-gray-600">婚紗照即將上傳，敬請期待！</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {columns.map((column, columnIndex) => (
                            <div
                                key={`column-${columnIndex}`}
                                className="flex flex-col space-y-3 sm:space-y-4"
                            >
                                {column.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className="cursor-pointer group"
                                        onClick={() => setSelectedPhoto(photo)}
                                    >
                                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                                            <div className="relative">
                                                <img
                                                    src={photo.thumbnailUrl}
                                                    alt={photo.name}
                                                    className="w-full h-auto"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 照片放大檢視 - 點擊任意處關閉 */}
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
