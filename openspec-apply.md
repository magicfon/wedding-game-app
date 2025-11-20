# 遊戲音效功能實現指南

## 概述
本文檔指導如何實現「遊戲實況加入遊戲音效」功能，基於已創建的 OpenSpec 變更提案。

## 實現步驟

### 階段 1: 音效系統基礎設施

#### 1.1 創建音效管理 Hook (useSoundEffects)
創建 `src/hooks/useSoundEffects.ts`，提供音效管理功能：

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'

interface SoundEffect {
  id: string
  url: string
  audio: HTMLAudioElement | null
}

interface UseSoundEffectsReturn {
  isSoundEnabled: boolean
  toggleSound: () => void
  playSound: (soundId: string) => void
  preloadSounds: () => Promise<void>
  isLoaded: boolean
}

export const useSoundEffects = (): UseSoundEffectsReturn => {
  // 實現音效管理邏輯
}
```

#### 1.2 設計音效配置介面和狀態管理
創建音效配置文件 `src/config/sounds.ts`：

```typescript
export const SOUND_EFFECTS = {
  GAME_START: 'game-start.mp3',
  COUNTDOWN: 'countdown.mp3',
  TIME_UP: 'time-up.mp3',
  CORRECT_ANSWER: 'correct-answer.mp3',
  LEADERBOARD: 'leaderboard.mp3',
  VOTE: 'vote.mp3',
} as const

export type SoundEffectType = keyof typeof SOUND_EFFECTS
```

#### 1.3 實現音效預載機制
在 useSoundEffects Hook 中實現預載功能：

```typescript
const preloadSounds = useCallback(async () => {
  try {
    const loadPromises = Object.values(SOUND_EFFECTS).map(async (soundFile) => {
      const audio = new Audio(`/sounds/${soundFile}`)
      await audio.load()
      return audio
    })
    
    await Promise.all(loadPromises)
    setIsLoaded(true)
  } catch (error) {
    console.error('Error preloading sounds:', error)
  }
}, [])
```

#### 1.4 添加音效開關控制組件
創建 `src/components/SoundToggle.tsx`：

```typescript
import { Volume2, VolumeX } from 'lucide-react'

interface SoundToggleProps {
  isEnabled: boolean
  onToggle: () => void
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ isEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
      aria-label={isEnabled ? '關閉音效' : '開啟音效'}
    >
      {isEnabled ? <Volume2 className="w-6 h-6 text-white" /> : <VolumeX className="w-6 h-6 text-white" />}
    </button>
  )
}
```

### 階段 2: 音效檔案準備

#### 2.1 創建 public/sounds/ 目錄結構
```
public/
└── sounds/
    ├── game-start.mp3
    ├── countdown.mp3
    ├── time-up.mp3
    ├── correct-answer.mp3
    ├── leaderboard.mp3
    └── vote.mp3
```

#### 2.2 準備遊戲音效檔案
需要準備以下音效檔案：
- `game-start.mp3`: 遊戲開始音效（歡快、激勵）
- `countdown.mp3`: 倒數音效（緊張感）
- `time-up.mp3`: 時間結束音效（明確提示）
- `correct-answer.mp3`: 正確答案音效（成功感）
- `leaderboard.mp3`: 排行榜音效（成就感）
- `vote.mp3`: 投票音效（輕柔提示）

### 階段 3: 遊戲實況頁面音效整合

#### 3.1-3.6 整合音效到遊戲實況頁面
修改 `src/app/game-live/page.tsx`，添加音效功能：

```typescript
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { SoundToggle } from '@/components/SoundToggle'

export default function GameLivePage() {
  const { isSoundEnabled, toggleSound, playSound, preloadSounds, isLoaded } = useSoundEffects()
  
  // 預載音效
  useEffect(() => {
    preloadSounds()
  }, [preloadSounds])
  
  // 在適當的時機播放音效
  useEffect(() => {
    if (gameState?.is_game_active && !gameState?.is_paused) {
      playSound('GAME_START')
    }
  }, [gameState?.is_game_active, gameState?.is_paused, playSound])
  
  // 倒數結束音效
  useEffect(() => {
    if (timeLeft <= 0 && displayPhase === 'options') {
      playSound('TIME_UP')
    }
  }, [timeLeft, displayPhase, playSound])
  
  // 正確答案音效
  useEffect(() => {
    if (displayPhase === 'options' && timeLeft <= 0) {
      playSound('CORRECT_ANSWER')
    }
  }, [displayPhase, timeLeft, playSound])
  
  // 排行榜音效
  useEffect(() => {
    if (displayPhase === 'rankings') {
      playSound('LEADERBOARD')
    }
  }, [displayPhase, playSound])
  
  // 投票音效（需要監聽投票事件）
  useEffect(() => {
    const subscription = supabase
      .channel('vote-events')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'votes' },
        () => {
          if (isSoundEnabled) {
            playSound('VOTE')
          }
        }
      )
      .subscribe()
      
    return () => subscription.unsubscribe()
  }, [isSoundEnabled, playSound])
  
  // 在 UI 中添加音效控制
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* 現有內容 */}
      
      {/* 音效控制 */}
      <div className="fixed top-4 right-4 z-50">
        <SoundToggle isEnabled={isSoundEnabled} onToggle={toggleSound} />
      </div>
      
      {/* 音效載入狀態指示 */}
      {!isLoaded && (
        <div className="fixed bottom-4 right-4 bg-white bg-opacity-20 text-white px-3 py-1 rounded-lg text-sm">
          音效載入中...
        </div>
      )}
    </div>
  )
}
```

### 階段 4: 照片牆投票音效觸發

#### 4.1 修改照片牆頁面觸發投票事件
修改 `src/app/photo-wall/page.tsx`，在投票時觸發事件：

```typescript
const handleVote = async (photoId: number) => {
  // 現有的投票邏輯
  
  // 觸發投票音效事件（通過 Supabase Realtime 或自定義事件）
  await supabase
    .from('vote_events')
    .insert({
      event_type: 'vote_cast',
      photo_id: photoId,
      created_at: new Date().toISOString()
    })
}
```

### 階段 5: 瀏覽器兼容性和效能優化

#### 5.1 處理不同瀏覽器的音效播放限制
在 useSoundEffects Hook 中添加瀏覽器兼容性處理：

```typescript
const playSound = useCallback((soundId: string) => {
  if (!isSoundEnabled || !isLoaded) return
  
  try {
    const soundFile = SOUND_EFFECTS[soundId as SoundEffectType]
    if (!soundFile) return
    
    const audio = new Audio(`/sounds/${soundFile}`)
    
    // 處理自動播放限制
    const playPromise = audio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Audio play failed:', error)
        // 可以在這裡添加用戶交互觸發邏輯
      })
    }
  } catch (error) {
    console.error('Error playing sound:', error)
  }
}, [isSoundEnabled, isLoaded])
```

## 實現檢查清單

### 基礎設施
- [x] 創建 useSoundEffects Hook
- [x] 創建音效配置文件
- [x] 實現音效預載機制
- [x] 創建 SoundToggle 組件

### 音效檔案
- [x] 創建 public/sounds/ 目錄
- [ ] 準備所有音效檔案
- [ ] 優化音效檔案大小

### 遊戲實況整合
- [x] 整合音效到遊戲實況頁面
- [x] 添加音效控制 UI
- [x] 實現投票音效監聽

### 照片牆整合
- [x] 創建投票事件觸發機制
- [x] 實現跨頁面音效同步

### 測試和優化
- [x] 創建音效測試頁面
- [ ] 測試音效在各種設備上的播放
- [ ] 驗證音效與遊戲事件的同步
- [x] 測試音效開關功能
- [x] 驗證投票音效的即時響應

## 已實現的文件

### 核心音效系統
- `src/hooks/useSoundEffects.ts` - 音效管理 Hook
- `src/components/SoundToggle.tsx` - 音效開關組件
- `src/lib/vote-events.ts` - 投票事件處理

### 頁面整合
- `src/app/game-live/page.tsx` - 遊戲實況頁面（已整合音效）
- `src/app/debug/sound-test/page.tsx` - 音效測試頁面

### 配置和文檔
- `public/sounds/README.md` - 音效檔案說明
- `openspec-apply.md` - 實現指南（本文件）

## 注意事項

1. **瀏覽器自動播放政策**: 現代瀏覽器限制自動播放，可能需要用戶交互才能播放音效
2. **音效檔案大小**: 保持音效檔案小巧，建議每個檔案不超過 100KB
3. **載入順序**: 重要音效（如遊戲開始）應優先載入
4. **錯誤處理**: 優雅處理音效載入和播放失敗的情況
5. **用戶體驗**: 提供清晰的音效狀態指示和控制

## 下一步

完成實現後，記得：
1. 更新 `openspec/changes/add-game-sound-effects/tasks.md` 中的任務狀態
2. 進行全面測試
3. 準備部署
4. 部署後歸檔變更