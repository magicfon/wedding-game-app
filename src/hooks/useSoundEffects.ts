import { useState, useEffect, useRef, useCallback } from 'react'

// 音效配置
export const SOUND_EFFECTS = {
  GAME_START: 'game-start.mp3',
  COUNTDOWN: 'countdown.mp3',
  TIME_UP: 'time-up.mp3',
  CORRECT_ANSWER: 'correct-answer.mp3',
  LEADERBOARD: 'leaderboard.mp3',
  VOTE: 'vote.mp3',
} as const

export type SoundEffectType = keyof typeof SOUND_EFFECTS

interface SoundEffect {
  id: string
  url: string
  audio: HTMLAudioElement | null
}

interface UseSoundEffectsReturn {
  isSoundEnabled: boolean
  toggleSound: () => void
  playSound: (soundId: SoundEffectType) => void
  stopSound: (soundId: SoundEffectType) => void
  preloadSounds: () => Promise<void>
  isLoaded: boolean
}

export const useSoundEffects = (): UseSoundEffectsReturn => {
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    // 從 localStorage 讀取音效設定
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sound-effects-enabled')
      return saved !== null ? saved === 'true' : true // 預設啟用
    }
    return true
  })

  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map())

  // 切換背景音樂開關（不影響遊戲音效）
  const toggleSound = useCallback(() => {
    const newState = !isSoundEnabled
    console.log('🔊 toggleSound 被調用, 新狀態:', newState ? '開啟' : '關閉')
    setIsSoundEnabled(newState)

    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound-effects-enabled', newState.toString())
    }
    // 注意：此開關只控制背景音樂，遊戲音效不受影響
  }, [isSoundEnabled])

  // 預載所有音效
  const preloadSounds = useCallback(async () => {
    try {
      console.log('🔊 開始預載音效...')

      const loadPromises = Object.entries(SOUND_EFFECTS).map(async ([key, soundFile]) => {
        try {
          const audio = new Audio(`/sounds/${soundFile}`)

          // 設定音效屬性
          audio.preload = 'auto'
          // 倒數音效設為最大音量，其他音效設為 0.5
          audio.volume = key === 'COUNTDOWN' ? 1.0 : 0.5

          // 等待音效載入
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true })
            audio.addEventListener('error', reject, { once: true })

            // 設定載入超時
            setTimeout(() => reject(new Error(`音效載入超時: ${soundFile}`)), 5000)
          })

          // 緩存音效
          audioCache.current.set(key, audio)
          console.log(`✅ 音效載入成功: ${soundFile}`)

          return audio
        } catch (error) {
          console.error(`❌ 音效載入失敗: ${soundFile}`, error)
          return null
        }
      })

      await Promise.all(loadPromises)
      setIsLoaded(true)
      console.log('🎉 所有音效預載完成')

    } catch (error) {
      console.error('❌ 音效預載失敗:', error)
      setIsLoaded(false)
    }
  }, [])

  // 播放遊戲音效（不受背景音樂開關影響，始終可以播放）
  const playSound = useCallback((soundId: SoundEffectType) => {
    if (!isLoaded) {
      console.log(`🔇 音效未載入，跳過播放: ${soundId}`)
      return
    }

    try {
      const audio = audioCache.current.get(soundId)

      if (!audio) {
        console.error(`❌ 找不到音效: ${soundId}`)
        return
      }

      // 重置音效到開始位置
      audio.currentTime = 0

      // 播放音效
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`🔊 播放音效: ${soundId}`)
          })
          .catch(error => {
            console.error(`❌ 音效播放失敗: ${soundId}`, error)

            // 如果是自動播放限制，嘗試創建用戶交互
            if (error.name === 'NotAllowedError') {
              console.log('🚫 瀏覽器阻止自動播放，需要用戶交互')
            }
          })
      }
    } catch (error) {
      console.error(`❌ 播放音效時發生錯誤: ${soundId}`, error)
    }
  }, [isLoaded])

  // 停止播放遊戲音效
  const stopSound = useCallback((soundId: SoundEffectType) => {
    try {
      const audio = audioCache.current.get(soundId)

      if (!audio) {
        console.log(`🔇 找不到音效: ${soundId}`)
        return
      }

      audio.pause()
      audio.currentTime = 0
      console.log(`⏹️ 停止音效: ${soundId}`)
    } catch (error) {
      console.error(`❌ 停止音效時發生錯誤: ${soundId}`, error)
    }
  }, [])

  // 組件掛載時預載音效
  useEffect(() => {
    preloadSounds()
  }, [preloadSounds])

  return {
    isSoundEnabled,
    toggleSound,
    playSound,
    stopSound,
    preloadSounds,
    isLoaded,
  }
}