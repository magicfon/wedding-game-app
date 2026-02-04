import { useEffect, useRef, useState, useCallback } from 'react'

interface UseBackgroundMusicProps {
    url: string
    enabled: boolean
    volume?: number
}

export const useBackgroundMusic = ({ url, enabled, volume = 0.3 }: UseBackgroundMusicProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const hasInteractedRef = useRef(false)
    const isAudioReadyRef = useRef(false)
    const hasTriedPlayRef = useRef(false)

    useEffect(() => {
        console.log('🎵 初始化背景音樂:', url)

        // 初始化 Audio 物件
        const audio = new Audio(url)
        audio.loop = true
        audio.volume = volume
        audio.preload = 'auto' // 預載音頻

        // 等待音頻載入完成
        audio.addEventListener('canplaythrough', () => {
            console.log('🎵 音頻載入完成，準備播放')
            isAudioReadyRef.current = true

            // 立即嘗試播放，不管 enabled 的當前值
            if (!hasTriedPlayRef.current) {
                hasTriedPlayRef.current = true
                const playPromise = audio.play()
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('🔊 背景音樂已播放（音頻載入完成後）')
                            setIsPlaying(true)
                        })
                        .catch((error) => {
                            console.log('🚫 自動播放被阻止，等待用戶交互:', error)
                            setIsPlaying(false)
                        })
                }
            }
        }, { once: true })

        audio.addEventListener('error', (error) => {
            console.error('❌ 背景音樂載入失敗:', error)
            isAudioReadyRef.current = false
        }, { once: true })

        audioRef.current = audio

        // 監聽用戶交互事件，在首次交互時嘗試播放音樂
        const handleInteraction = () => {
            if (!hasInteractedRef.current && audioRef.current && isAudioReadyRef.current) {
                hasInteractedRef.current = true
                console.log('👆 用戶交互，嘗試播放背景音樂')
                audioRef.current.play()
                    .then(() => {
                        console.log('🔊 背景音樂已播放（用戶交互後）')
                        setIsPlaying(true)
                    })
                    .catch((error) => {
                        console.log('播放失敗:', error)
                        setIsPlaying(false)
                    })
                // 移除事件監聽器
                window.removeEventListener('click', handleInteraction)
                window.removeEventListener('keydown', handleInteraction)
            }
        }

        window.addEventListener('click', handleInteraction)
        window.addEventListener('keydown', handleInteraction)

        return () => {
            audio.pause()
            audio.src = ''
            audioRef.current = null
            window.removeEventListener('click', handleInteraction)
            window.removeEventListener('keydown', handleInteraction)
        }
    }, [url])

    useEffect(() => {
        console.log('🎵 useBackgroundMusic enabled 變化, enabled:', enabled)
        const audio = audioRef.current
        if (!audio) {
            console.log('🎵 audioRef.current 為 null')
            return
        }

        // 更新音量
        audio.volume = volume

        // 優先處理暫停操作，確保關閉音效時立即停止
        if (!enabled) {
            console.log('🔇 背景音樂已暫停')
            audio.pause()
            audio.currentTime = 0 // 重置到開始位置
            setIsPlaying(false)
            return
        }

        // 啟用時嘗試播放
        if (isAudioReadyRef.current) {
            const playPromise = audio.play()

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('🔊 背景音樂已播放（enabled 變化）')
                        setIsPlaying(true)
                    })
                    .catch((error) => {
                        console.log('Autoplay prevented:', error)
                        setIsPlaying(false)
                    })
            }
        }
    }, [enabled, volume])

    // 提供一個手動播放的方法，用於處理瀏覽器自動播放限制
    const tryPlay = useCallback(() => {
        console.log('🎵 tryPlay 被調用, enabled:', enabled)
        if (audioRef.current && enabled) {
            audioRef.current.play()
                .then(() => {
                    console.log('🔊 背景音樂已播放（tryPlay）')
                    setIsPlaying(true)
                })
                .catch((error) => {
                    console.error('tryPlay 播放失敗:', error)
                    setIsPlaying(false)
                })
        }
    }, [enabled])

    return { isPlaying, tryPlay }
}
