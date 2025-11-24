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
        const audio = audioRef.current
        if (!audio) return

        // 更新音量
        audio.volume = volume

        if (enabled) {
            const playPromise = audio.play()

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setIsPlaying(true)
                    })
                    .catch((error) => {
                        console.log('Autoplay prevented:', error)
                        setIsPlaying(false)
                    })
            }
        } else {
            audio.pause()
            setIsPlaying(false)
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
