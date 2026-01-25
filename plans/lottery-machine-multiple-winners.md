# 彩票機模式支援多位中獎者 - 設計文檔

## 目標
將 `lottery` 資料夾的動畫及軌道設定完整功能整合到 `lottery-live` 功能中的「彩票機」動畫模式，不受每次抽獎人數限制。

## 需求確認
- **顯示方式**：逐一顯示每位中獎者
- **控制方式**：由「下一位」按鈕控制抽下一位中獎者（而非自動等待）
- **LINE 通知**：每位中獎者發送 LINE 通知
- **照片**：每位中獎者有自己的照片

## 目前狀況

### API 層面
- ✅ `draw/route.ts` 已支援多位中獎者（`winners_per_draw`）
- ✅ 每位中獎者會建立一筆 `lottery_history` 記錄
- ✅ 返回 `lottery_ids` 陣列（所有中獎者的 ID）
- ⚠️ `lottery_state.current_draw_id` 只儲存第一位中獎者的 ID
- ⚠️ `control/route.ts` GET 路由只返回 `current_draw_id` 對應的記錄
- ⚠️ `control/route.ts` PATCH 路由的 `validModes` 不包含 `'lottery_machine'`

### 前端層面
- ✅ `admin/lottery/page.tsx` 已有 `winners_per_draw` 設定 UI
- ✅ `lottery-live/page.tsx` 從 API 獲取 `lotteryState`，包含 `winners_per_draw`
- ⚠️ `lottery-live/page.tsx` 只處理單一中獎者（`currentDraw`）
- ⚠️ `LotteryMachineLottery.tsx` 硬編碼 `winnersPerDraw = 3`

## 實作方案

### 1. 修復 API control 路由

#### 1.1 修復 PATCH 路由的 validModes
**檔案**: `src/app/api/lottery/control/route.ts`

```typescript
// 修復前
const validModes = ['fast_shuffle', 'waterfall', 'tournament']

// 修復後
const validModes = ['fast_shuffle', 'waterfall', 'tournament', 'lottery_machine']
```

#### 1.2 修改 GET 路由返回所有中獎者
**檔案**: `src/app/api/lottery/control/route.ts`

```typescript
// 如果有當前抽獎 ID，獲取詳細資訊
let currentDraw = null
let currentDraws = [] // 新增：所有中獎者陣列

if (state?.current_draw_id) {
  // 獲取第一位中獎者（向後相容）
  const { data: draw } = await supabase
    .from('lottery_history')
    .select('*')
    .eq('id', state.current_draw_id)
    .single()

  currentDraw = draw

  // 獲取所有同批次的中獎者（使用 draw_started_at）
  if (state?.draw_started_at) {
    const { data: draws } = await supabase
      .from('lottery_history')
      .select('*')
      .gte('draw_time', new Date(state.draw_started_at).toISOString())
      .order('draw_time', { ascending: true })

    currentDraws = draws || []
  }
}

return NextResponse.json({
  success: true,
  state: state || {
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  },
  current_draw: currentDraw,
  current_draws: currentDraws // 新增：所有中獎者陣列
})
```

### 2. 更新類型定義

#### 2.1 修改 types.ts
**檔案**: `src/components/lottery-modes/types.ts`

```typescript
export interface LotteryModeProps {
    photos: Photo[]
    winnerPhoto: Photo // 單一中獎者（向後相容）
    winnerIndex: number
    winnerPhotos?: Photo[] // 新增：多位中獎者陣列
    winnersPerDraw?: number // 新增：每次抽獎人數
    onAnimationComplete: (winnerPhoto: Photo) => void
    isAnimating: boolean
    scale: number
}
```

### 3. 修改 LotteryMachineLottery 組件

#### 3.1 接收 winnersPerDraw 參數
**檔案**: `src/components/lottery-modes/LotteryMachineLottery.tsx`

```typescript
export const LotteryMachineLottery = memo(({
  photos,
  winnerPhoto,
  winnerIndex,
  winnerPhotos, // 新增
  winnersPerDraw = 3, // 新增，預設值為 3（向後相容）
  onAnimationComplete,
  isAnimating,
  scale
}: LotteryModeProps) => {
  // 使用傳入的 winnersPerDraw，而不是硬編碼
  const [bouncingPhotos, setBouncingPhotos] = useState<BouncingPhoto[]>([])
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'bouncing' | 'drawing' | 'complete'>('idle')
  // ... 其他程式碼
})
```

#### 3.2 支援多位中獎者照片
**檔案**: `src/components/lottery-modes/LotteryMachineLottery.tsx`

```typescript
// 如果提供了 winnerPhotos 陣列，使用它；否則使用單一 winnerPhoto
const finalWinnerPhotos = winnerPhotos || (winnerPhoto ? [winnerPhoto] : [])

// 修改 startDrawing 函數
const startDrawing = useCallback(() => {
  setAnimationPhase('drawing')

  // 重置計數器
  winnersDrawnRef.current = 0
  const totalWinners = Math.min(winnersPerDraw, finalWinnerPhotos.length)

  const drawNextWinner = () => {
    const currentDrawn = winnersDrawnRef.current

    if (currentDrawn >= totalWinners) {
      // 抽獎完成
      setAnimationPhase('complete')
      return
    }

    // 獲取當前要抽出的中獎者照片
    const targetWinnerPhoto = finalWinnerPhotos[currentDrawn]
    const targetWinnerIndex = photos.findIndex(p => p.id === targetWinnerPhoto.id)

    // 從 ref 中獲取當前照片列表
    const currentPhotos = bouncingPhotosRef.current
    const availablePhotos = currentPhotos.filter(p => !p.isFlyingOut && !p.isWinner)

    if (availablePhotos.length === 0) {
      // 沒有可用的照片，結束抽獎
      setAnimationPhase('complete')
      return
    }

    // 找到對應的照片
    const winnerPhoto = availablePhotos.find(p => p.photo.id === targetWinnerPhoto.id)

    if (!winnerPhoto) {
      console.error('❌ 找不到中獎照片:', targetWinnerPhoto.id)
      setAnimationPhase('complete')
      return
    }

    // 計算目標位置（中獎者顯示區）- 從右到左排列
    const winnerOrder = currentDrawn + 1
    const spacing = 300
    // 從右邊開始排列：5,4,3,2,1
    const startX = DESIGN_WIDTH - 200
    const targetX = startX - (winnerOrder - 1) * spacing
    const targetY = DESIGN_HEIGHT / 2

    // 更新照片狀態
    setBouncingPhotos(prevPhotos => {
      const newPhotos = prevPhotos.map(p => {
        if (p.id === winnerPhoto.id) {
          return {
            ...p,
            isFlyingOut: true,
            isWinner: true,
            winnerOrder,
            targetX,
            targetY,
            pipePhase: 'entering' as const
          }
        }
        return p
      })

      // 同步 ref
      bouncingPhotosRef.current = newPhotos

      return newPhotos
    })

    // 增加計數器
    winnersDrawnRef.current++

    // 1.5秒後抽下一個
    setTimeout(drawNextWinner, 1500)
  }

  drawNextWinner()
}, [winnersPerDraw, finalWinnerPhotos, photos])
```

### 4. 修改 lottery-live/page.tsx

#### 4.1 從 lotteryState 獲取 winners_per_draw
**檔案**: `src/app/lottery-live/page.tsx`

```typescript
// 新增狀態
const [currentDraws, setCurrentDraws] = useState<CurrentDraw[]>([]) // 所有中獎者陣列
const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0) // 當前顯示的中獎者索引

// 修改 fetchLotteryState
const fetchLotteryState = async (fromRealtime = false) => {
  try {
    const response = await fetch('/api/lottery/control')
    const data = await response.json()

    if (data.success) {
      setLotteryState(data.state)

      // 更新動畫模式
      if (data.state.animation_mode) {
        setAnimationMode(data.state.animation_mode)
      }

      // 更新所有中獎者陣列
      if (data.current_draws && data.current_draws.length > 0) {
        setCurrentDraws(data.current_draws)
      }

      // 注意：不在這裡調用 startCelebration()
      // 慶祝效果只應該在動畫結束時觸發（由 animateSelection 控制）
      if (data.current_draw && data.current_draw.id !== latestCurrentDraw?.id) {
        // 如果是 Realtime 觸發的更新，且是新的抽獎，則忽略（交給 handleNewDraw 處理）
        if (fromRealtime) {
          console.log('⚠️ Realtime 觸發的新抽獎更新，忽略（交給 handleNewDraw）')
          return
        }

        console.log('📝 更新 currentDraw:', data.current_draw)
        setCurrentDraw(data.current_draw)
      }
    }
  } catch (error) {
    console.error('獲取抽獎狀態失敗:', error)
  }
}
```

#### 4.2 修改 handleNewDraw 處理多位中獎者
**檔案**: `src/app/lottery-live/page.tsx`

```typescript
const handleNewDraw = async (newDraw: CurrentDraw) => {
  // 先重置所有狀態（但不重置照片，因為已經預載過了）
  setCurrentDraw(null)
  setCurrentDraws([])
  setCelebrating(false)
  setShowingWinner(false)
  setZoomingWinner(false)
  setWinnerPhotoRect(null)
  setHighlightedIndex(-1)
  setIsAnimating(false)
  setWinnerIndex(-1)
  setSelectedWinnerPhoto(null)
  setCurrentWinnerIndex(0)

  setCurrentDraw(newDraw)

  console.log('🎰 收到新的抽獎記錄')
  console.log('當前照片數量:', photos.length)

  // 使用已載入的照片（頁面載入時已預載）
  let currentPhotos = photos

  // 如果照片還沒載入，重新獲取
  if (currentPhotos.length === 0) {
    console.log('⚠️ 照片尚未載入，現在載入...')
    const response = await fetch('/api/lottery/photos')
    const data = await response.json()
    if (data.success && data.photos) {
      currentPhotos = data.photos
      setPhotos(data.photos)
    }
  }

  if (currentPhotos.length > 0) {
    console.log(`📸 使用 ${currentPhotos.length} 張照片進行抽獎`)

    // 獲取所有中獎者記錄
    const allDrawsResponse = await fetch('/api/lottery/control')
    const allDrawsData = await allDrawsResponse.json()

    if (allDrawsData.success && allDrawsData.current_draws && allDrawsData.current_draws.length > 0) {
      setCurrentDraws(allDrawsData.current_draws)
      console.log(`🎉 共有 ${allDrawsData.current_draws.length} 位中獎者`)

      // 為每位中獎者找到對應的照片
      const winnerPhotos = allDrawsData.current_draws.map((draw: CurrentDraw) => {
        let targetWinnerPhoto: Photo
        let targetWinnerIndex: number

        if (draw.winner_photo_id) {
          const foundIndex = currentPhotos.findIndex((p: Photo) => p.id === draw.winner_photo_id)
          if (foundIndex !== -1) {
            targetWinnerPhoto = currentPhotos[foundIndex]
            targetWinnerIndex = foundIndex
          } else {
            const winnerPhotos = currentPhotos.filter((p: Photo) => p.user_id === draw.winner_line_id)
            if (winnerPhotos.length > 0) {
              const randomWinnerPhoto = winnerPhotos[Math.floor(Math.random() * winnerPhotos.length)]
              targetWinnerIndex = currentPhotos.findIndex((p: Photo) => p.id === randomWinnerPhoto.id)
              targetWinnerPhoto = randomWinnerPhoto
            } else {
              const randomIndex = Math.floor(Math.random() * currentPhotos.length)
              targetWinnerPhoto = currentPhotos[randomIndex]
              targetWinnerIndex = randomIndex
            }
          }
        } else {
          const winnerPhotos = currentPhotos.filter((p: Photo) => p.user_id === draw.winner_line_id)
          if (winnerPhotos.length === 0) {
            const randomIndex = Math.floor(Math.random() * currentPhotos.length)
            targetWinnerPhoto = currentPhotos[randomIndex]
            targetWinnerIndex = randomIndex
          } else {
            const randomWinnerPhoto = winnerPhotos[Math.floor(Math.random() * winnerPhotos.length)]
            targetWinnerIndex = currentPhotos.findIndex((p: Photo) => p.id === randomWinnerPhoto.id)
            targetWinnerPhoto = randomWinnerPhoto
          }
        }

        return targetWinnerPhoto
      })

      // 儲存所有中獎者照片
      setSelectedWinnerPhoto(winnerPhotos[0]) // 第一位中獎者照片（用於向後相容）

      // 直接開始動畫（照片已在頁面載入時預載完成）
      setIsAnimating(true)
      setWinnerIndex(currentPhotos.findIndex((p: Photo) => p.id === winnerPhotos[0].id))

      // 如果是彩票機模式，傳入所有中獎者照片
      if (animationMode === 'lottery_machine') {
        // 彩票機模式會自己處理多位中獎者的動畫
        console.log('🎰 彩票機模式，傳入所有中獎者照片')
      } else {
        // 其他模式：只處理第一位中獎者
        startCarouselAnimationWithPhotos(currentPhotos, currentPhotos.findIndex((p: Photo) => p.id === winnerPhotos[0].id))
      }
    } else {
      // 沒有多位中獎者，使用原本的邏輯
      // ... 原本的程式碼
    }
  } else {
    console.error('❌ 無法載入照片進行抽獎')
  }
}
```

#### 4.3 新增「下一位」按鈕控制
**檔案**: `src/app/lottery-live/page.tsx`

```typescript
// 新增狀態：是否有下一位中獎者
const [hasNextWinner, setHasNextWinner] = useState(false)

// 新動畫模式完成時的回調（支援多位中獎者）
const handleAnimationComplete = useCallback((completedWinnerPhoto: Photo) => {
  console.log('🎉 動畫完成，中獎者:', completedWinnerPhoto.display_name)

  const currentIndex = currentWinnerIndex
  const totalWinners = currentDraws.length

  // 顯示當前中獎者
  setIsAnimating(false)
  startCelebration(completedWinnerPhoto)

  // 檢查是否還有下一位中獎者
  if (currentIndex + 1 < totalWinners) {
    setHasNextWinner(true)
    console.log(`📊 還有 ${totalWinners - currentIndex - 1} 位中獎者待顯示`)
  } else {
    setHasNextWinner(false)
    console.log('✅ 所有中獎者已顯示完畢')
  }
}, [currentWinnerIndex, currentDraws])

// 處理「下一位」按鈕點擊
const handleNextWinner = useCallback(() => {
  const currentIndex = currentWinnerIndex
  const totalWinners = currentDraws.length

  if (currentIndex + 1 >= totalWinners) {
    console.log('⚠️ 沒有下一位中獎者')
    return
  }

  console.log(`👉 點擊「下一位」按鈕，顯示第 ${currentIndex + 2} 位中獎者`)

  // 重置狀態以顯示下一位中獎者
  setCelebrating(false)
  setShowingWinner(false)
  setZoomingWinner(false)
  setWinnerPhotoRect(null)

  // 更新當前中獎者索引
  setCurrentWinnerIndex(currentIndex + 1)

  // 獲取下一位中獎者照片
  const nextDraw = currentDraws[currentIndex + 1]
  let nextWinnerPhoto: Photo
  let nextWinnerIndex: number

  if (nextDraw.winner_photo_id) {
    const foundIndex = photos.findIndex((p: Photo) => p.id === nextDraw.winner_photo_id)
    if (foundIndex !== -1) {
      nextWinnerPhoto = photos[foundIndex]
      nextWinnerIndex = foundIndex
    } else {
      const winnerPhotos = photos.filter((p: Photo) => p.user_id === nextDraw.winner_line_id)
      if (winnerPhotos.length > 0) {
        const randomWinnerPhoto = winnerPhotos[Math.floor(Math.random() * winnerPhotos.length)]
        nextWinnerIndex = photos.findIndex((p: Photo) => p.id === randomWinnerPhoto.id)
        nextWinnerPhoto = randomWinnerPhoto
      } else {
        const randomIndex = Math.floor(Math.random() * photos.length)
        nextWinnerPhoto = photos[randomIndex]
        nextWinnerIndex = randomIndex
      }
    }
  } else {
    const winnerPhotos = photos.filter((p: Photo) => p.user_id === nextDraw.winner_line_id)
    if (winnerPhotos.length === 0) {
      const randomIndex = Math.floor(Math.random() * photos.length)
      nextWinnerPhoto = photos[randomIndex]
      nextWinnerIndex = randomIndex
    } else {
      const randomWinnerPhoto = winnerPhotos[Math.floor(Math.random() * winnerPhotos.length)]
      nextWinnerIndex = photos.findIndex((p: Photo) => p.id === randomWinnerPhoto.id)
      nextWinnerPhoto = randomWinnerPhoto
    }
  }

  // 更新 selectedWinnerPhoto
  setSelectedWinnerPhoto(nextWinnerPhoto)

  // 開始下一位中獎者的動畫
  setIsAnimating(true)
  setWinnerIndex(nextWinnerIndex)

  // 根據動畫模式啟動動畫
  if (animationMode === 'lottery_machine') {
    // 彩票機模式會自己處理
    console.log('🎰 彩票機模式，繼續顯示下一位中獎者')
  } else {
    // 其他模式
    startCarouselAnimationWithPhotos(photos, nextWinnerIndex)
  }

  setHasNextWinner(false)
}, [currentWinnerIndex, currentDraws, photos, animationMode])
```

#### 4.4 傳遞 winnersPerDraw 和 winnerPhotos 給動畫組件
**檔案**: `src/app/lottery-live/page.tsx`

```typescript
// 在渲染 LotteryMachineLottery 時傳入參數
{animationMode === 'lottery_machine' && (
  <LotteryMachineLottery
    photos={photos}
    winnerPhoto={selectedWinnerPhoto}
    winnerIndex={winnerIndex}
    winnerPhotos={currentDraws.map(draw => {
      // 為每位中獎者找到對應的照片
      // ... 程式碼同 handleNewDraw
      return winnerPhoto
    })}
    winnersPerDraw={lotteryState.winners_per_draw || 1}
    onAnimationComplete={handleAnimationComplete}
    isAnimating={isAnimating}
    scale={scale}
  />
)}
```

#### 4.5 新增「下一位」按鈕 UI
**檔案**: `src/app/lottery-live/page.tsx`

在中獎畫面顯示時，加入「下一位」按鈕：

```typescript
{/* 中獎照片放大特寫 - 左右分欄布局 */}
{!isAnimating && showingWinner && !zoomingWinner && selectedWinnerPhoto && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-500">
    <div className="flex items-center justify-center gap-12 px-8" style={{ width: `${DESIGN_WIDTH * scale}px`, height: `${DESIGN_HEIGHT * scale}px` }}>
      {/* 左側：中獎照片 */}
      <div className="relative flex-shrink-0 animate-in zoom-in duration-500" style={{ willChange: 'transform' }}>
        {/* ... 照片顯示程式碼 ... */}
      </div>

      {/* 右側：恭喜文字 + 資訊卡片 + 下一位按鈕 */}
      <div className="flex flex-col justify-center gap-8 flex-1" style={{ maxWidth: `${880 * scale}px`, willChange: 'transform' }}>
        {/* 恭喜文字 */}
        {/* ... 恭喜文字程式碼 ... */}

        {/* 中獎者資訊卡片 */}
        {/* ... 資訊卡片程式碼 ... */}

        {/* 下一位按鈕 */}
        {hasNextWinner && (
          <button
            onClick={handleNextWinner}
            className="mt-8 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full font-bold text-xl shadow-lg transition-all duration-200 transform hover:scale-105 animate-bounce"
            style={{ padding: `${1.5 * scale}rem ${2 * scale}rem`, fontSize: `${1.5 * scale}rem` }}
          >
            👉 下一位中獎者
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

#### 4.6 為每位中獎者發送 LINE 通知
**檔案**: `src/app/lottery-live/page.tsx`

```typescript
// 修改 startCelebration 函數
const startCelebration = (winnerPhoto?: Photo) => {
  console.log('🎊 開始慶祝動畫')
  setCelebrating(true)

  // 1.5秒後開始放大中獎照片（讓大家先看清楚中獎的是哪張）
  setTimeout(() => {
    console.log('🔍 開始放大中獎照片')

    // 獲取中獎照片的位置
    if (winnerPhotoRef.current) {
      const rect = winnerPhotoRef.current.getBoundingClientRect()
      setWinnerPhotoRect(rect)
      console.log('📍 中獎照片位置:', rect)
    } else {
      console.error('❌ 無法獲取中獎照片位置 (winnerPhotoRef is null)')
      // 嘗試查找 DOM
      const el = document.querySelector('.border-green-400')
      if (el) {
        const rect = el.getBoundingClientRect()
        setWinnerPhotoRect(rect)
        console.log('📍 透過 DOM 找到中獎照片位置:', rect)
      }
    }

    // 先觸發縮放動畫
    setZoomingWinner(true)

    // 800ms 後（縮放動畫完成）切換到完整顯示
    setTimeout(() => {
      setShowingWinner(true)
      setZoomingWinner(false)
      console.log('✅ 中獎畫面顯示完成，等待管理員操作...')

      // 為當前中獎者觸發 LINE 通知
      const currentDrawIndex = currentWinnerIndex
      const currentDrawRecord = currentDraws[currentDrawIndex]

      if (currentDrawRecord && winnerPhoto) {
        console.log(`📨 準備觸發 LINE 通知, 第 ${currentDrawIndex + 1} 位中獎者, lotteryId: ${currentDrawRecord.id}`)

        if (lotteryState.notify_winner_enabled) {
          fetch('/api/lottery/notify-winner', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              lotteryId: currentDrawRecord.id,
              winnerPhotoUrl: winnerPhoto.image_url
            })
          }).then(res => {
            console.log('📨 API 回應狀態:', res.status)
            return res.json()
          })
            .then(data => {
              if (data.success) {
                console.log('✅ LINE 通知發送成功')
              } else {
                console.error('❌ LINE 通知發送失敗:', data.error)
              }
            })
            .catch(err => console.error('❌ LINE 通知請求失敗:', err))
        } else {
          console.log('⚠️ 中獎通知已關閉，不發送通知')
        }
      } else {
        console.error('❌ 無法發送通知: currentDrawRecord 或 winnerPhoto 為空')
      }
    }, 800)
  }, 1500)
}
```

## 實作步驟

1. ✅ 修復 API control 路由：將 'lottery_machine' 加入 validModes 驗證列表
2. ✅ 更新 API control GET 路由：返回所有相關的中獎者記錄
3. ✅ 更新 types.ts：在 LotteryModeProps 中新增 winnersPerDraw 和 winnerPhotos 參數
4. ✅ 修改 LotteryMachineLottery.tsx：接收 winnersPerDraw 參數並動態調整中獎者數量
5. ✅ 修改 LotteryMachineLottery.tsx：支援多位中獎者照片陣列
6. ✅ 修改 lottery-live/page.tsx：從 lotteryState 獲取 winners_per_draw 並傳遞給動畫組件
7. ✅ 修改 lottery-live/page.tsx：處理多位中獎者情況（使用 draw_started_at 查詢同批次的中獎者）
8. ✅ 修改 lottery-live/page.tsx：新增「下一位」按鈕控制邏輯
9. ✅ 修改 lottery-live/page.tsx：為每位中獎者發送 LINE 通知
10. ✅ 修改 lottery-live/page.tsx：新增「下一位」按鈕 UI
11. ✅ 測試驗證：確保彩票機模式支援動態的每次抽獎人數設定

## 測試計劃

1. **單一中獎者測試**
   - 設定 `winners_per_draw = 1`
   - 執行抽獎
   - 驗證動畫正常執行
   - 驗證 LINE 通知發送成功
   - 驗證不顯示「下一位」按鈕

2. **多位中獎者測試**
   - 設定 `winners_per_draw = 3`
   - 執行抽獎
   - 驗證動畫依次抽出 3 位中獎者
   - 驗證第 1 位中獎者顯示後，出現「下一位」按鈕
   - 點擊「下一位」按鈕，驗證第 2 位中獎者顯示
   - 點擊「下一位」按鈕，驗證第 3 位中獎者顯示
   - 驗證第 3 位中獎者顯示後，不顯示「下一位」按鈕
   - 驗證每位中獎者都收到 LINE 通知

3. **邊界條件測試**
   - 設定 `winners_per_draw = 10`（最大值）
   - 驗證動畫能正常處理大量中獎者
   - 驗證「下一位」按鈕在每位中獎者顯示後出現
   - 驗證最後一位中獎者顯示後，「下一位」按鈕消失

4. **向後相容性測試**
   - 測試其他動畫模式（快速切換、瀑布流、淘汰賽）
   - 驗證不會因為修改而影響其他模式

5. **按鈕互動測試**
   - 驗證「下一位」按鈕在顯示中獎者時才出現
   - 驗證點擊「下一位」按鈕後，舊的中獎者畫面消失
   - 驗證點擊「下一位」按鈕後，新的中獎者動畫開始
   - 驗證在動畫進行中時，「下一位」按鈕不可點擊

## 注意事項

1. **向後相容性**
   - 保持 `winnerPhoto` 和 `winnerIndex` 參數，確保其他動畫模式正常運作
   - `winnerPhotos` 和 `winnersPerDraw` 為可選參數

2. **效能優化**
   - 照片預載入已在頁面載入時完成，不需要重複載入
   - 使用 `useCallback` 和 `useMemo` 優化效能

3. **錯誤處理**
   - 如果找不到中獎照片，使用隨機照片作為 fallback
   - 如果 API 返回錯誤，顯示錯誤訊息

4. **使用者體驗**
    - 每位中獎者顯示由「下一位」按鈕控制，管理員可自由調整節奏
    - 顯示中獎者序號（第 1 位、第 2 位...）
    - 保持動畫流暢，避免卡頓
