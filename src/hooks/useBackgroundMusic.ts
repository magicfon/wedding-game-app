import { useEffect, useRef, useState, useCallback } from 'react'

interface UseBackgroundMusicProps {
    url: string
    enabled: boolean
    volume?: number
}

export const useBackgroundMusic = ({ url, enabled, volume = 0.3 }: UseBackgroundMusicProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    useEffect(() => {
        // 初始化 Audio 物件
        const audio = new Audio(url)
        audio.loop = true
        audio.volume = volume
        audioRef.current = audio

        return () => {
            audio.pause()
            audio.src = ''
            audioRef.current = null
        }
    }, [url])

    useEffect(() => {
        console.log('🎵 useBackgroundMusic useEffect 觸發, enabled:', enabled)
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
        const playPromise = audio.play()

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('🔊 背景音樂已播放')
                    setIsPlaying(true)
                })
                .catch((error) => {
                    console.log('Autoplay prevented:', error)
                    setIsPlaying(false)
                })
        }
    }, [enabled, volume])

    // 提供一個手動播放的方法，用於處理瀏覽器自動播放限制
    const tryPlay = useCallback(() => {
        if (audioRef.current && enabled) {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(console.error)
        }
    }, [enabled])

    return { isPlaying, tryPlay }
}
