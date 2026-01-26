# Lottery Machine Live 修改計畫

## 概述
本文檔詳細說明 lottery-machine-live 需要修改的 5 個問題，所有修改都參照 `@/lottery/` 的實作方式。

---

## 問題 1: 調整 chamber/platform 大小時不要自動儲存

### 現況分析
- **lottery-machine-live**: 在 [`handleElementDragEnd()`](src/app/lottery-machine-live/page.tsx:1054-1060) 中，每次拖曳結束都會自動呼叫 `saveTrackConfig()`
- **lottery/**: 在 [`script.js`](lottery/script.js:1317-1333) 中，`stopElementDrag()` 函數也會自動呼叫 `saveSettings()`

### 修改方案
**目標**: 移除 chamber 和 platform 大小調整時的自動儲存，只在使用者點擊「儲存設定」按鈕時才儲存。

**修改位置**: [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx:1054-1060)

**修改內容**:
```typescript
// 修改前 (line 1054-1060)
const handleElementDragEnd = () => {
  if (elementDragState) {
    // 保存設定到後端
    saveTrackConfig()  // ❌ 移除這行
    setElementDragState(null)
  }
}

// 修改後
const handleElementDragEnd = () => {
  if (elementDragState) {
    // 不再自動儲存，只清除拖曳狀態
    setElementDragState(null)
  }
}
```

**影響範圍**:
- Chamber 大小調整（寬度、高度）
- Platform 大小調整（寬度、高度）
- Chamber/Platform 位置調整

**參考**: [`lottery/script.js:1317-1333`](lottery/script.js:1317-1333) 雖然也有自動儲存，但根據需求，我們需要移除此行為。

---

## 問題 2: Chamber 四個角的圓角不一致

### 現況分析
- **lottery-machine-live**: 在 CSS 中，chamber 的圓角設定為 `border-radius: clamp(14px, 1.4vw, 24px) 0 clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px)`（line 1792）
  - 左上角: `clamp(14px, 1.4vw, 24px)` ✅
  - 右上角: `0` ❌（應該有圓角）
  - 左下角: `clamp(8px, 0.8vw, 14px)` ✅
  - 右下角: `clamp(8px, 0.8vw, 14px)` ✅

- **lottery/**: 在 [`styles.css:419`](lottery/styles.css:419) 中，chamber 的圓角為 `border-radius: clamp(14px, 1.4vw, 24px) clamp(14px, 1.4vw, 24px) clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px)`
  - 左上角: `clamp(14px, 1.4vw, 24px)`
  - 右上角: `clamp(14px, 1.4vw, 24px)` ✅
  - 左下角: `clamp(8px, 0.8vw, 14px)`
  - 右下角: `clamp(8px, 0.8vw, 14px)`

### 修改方案
**目標**: 修正 chamber 右上角的圓角，使其與左上角一致。

**修改位置**: [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx:1792)

**修改內容**:
```tsx
// 修改前 (line 1792)
border-radius: clamp(14px, 1.4vw, 24px) 0 clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px);

// 修改後
border-radius: clamp(14px, 1.4vw, 24px) clamp(14px, 1.4vw, 24px) clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px);
```

**視覺效果**:
- Chamber 上方兩個角（左上、右上）都會有較大的圓角
- Chamber 下方兩個角（左下、右下）會有較小的圓角
- 整體視覺效果與 lottery/ 一致

**參考**: [`lottery/styles.css:419`](lottery/styles.css:419)

---

## 問題 3: Winner Platform 彩球大小應自適應 Platform 高度

### 現況分析
- **lottery-machine-live**: 在 [`animateWinnerSelection()`](src/app/lottery-machine-live/page.tsx:626-643) 中，彩球大小是固定的：
  ```typescript
  const ballSize = Math.max(20, Math.round(platformHeight * 0.9))
  ```
  但這個計算只在添加新中獎者時執行一次，不會在 platform 高度變化時自動更新。

- **lottery/**: 使用 `ResizeObserver` 監聽 platform 高度變化，並自動更新所有彩球大小：
  - [`setupPlatformBallResize()`](lottery/script.js:1352-1392) 函數設置 ResizeObserver
  - [`updateBallSizes()`](lottery/script.js:1357-1371) 函數更新所有彩球大小
  - 當 platform 高度變化時，所有已存在的彩球都會自動調整大小

### 修改方案
**目標**: 實作 ResizeObserver 機制，讓 winner platform 上的彩球大小隨 platform 高度變化自動調整。

**修改位置**: [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx)

**修改內容**:

1. **添加 ResizeObserver 的 useEffect** (在現有的 useEffect 之後添加):
```typescript
// 監聽 platform 高度變化並自動更新彩球大小
useEffect(() => {
  const platformSurface = document.querySelector('.platform-surface') as HTMLElement
  if (!platformSurface) return

  // 更新彩球大小的函數
  const updateBallSizes = () => {
    const platformHeight = platformSurface.offsetHeight
    const ballSize = Math.max(20, Math.round(platformHeight * 0.9))

    const winnerPhotos = document.querySelectorAll('.platform-winner-photo')
    winnerPhotos.forEach(photo => {
      const el = photo as HTMLElement
      el.style.width = `${ballSize}px`
      el.style.height = `${ballSize}px`
    })

    console.log('📏 更新彩球大小:', ballSize, 'px (平台高度:', platformHeight, 'px)')
  }

  // 使用 ResizeObserver 監聽 platform 高度變化
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === platformSurface) {
        updateBallSizes()
      }
    }
  })

  resizeObserver.observe(platformSurface)

  // 初始更新
  updateBallSizes()

  return () => {
    resizeObserver.disconnect()
  }
}, [winners.length]) // 當 winners 變化時重新設置
```

2. **修改 animateWinnerSelection 中的彩球大小計算** (保持不變，但確保邏輯一致):
```typescript
// 在 onAnimationComplete 中 (line 626-643)
const platformSurface = platformSlots.parentElement?.querySelector('.platform-surface') as HTMLElement
const platformHeight = platformSurface?.clientHeight || 60
const ballSize = Math.max(20, Math.round(platformHeight * 0.9))

const winnerEl = document.createElement('div')
winnerEl.className = 'platform-winner'
winnerEl.innerHTML = `
  <div class="platform-winner-photo" style="width: ${ballSize}px; height: ${ballSize}px;">
    <img src="${winner.avatar_url}" alt="${winner.display_name}">
  </div>
  <div class="platform-winner-rank">#${winners.length + 1}</div>
`
```

**影響範圍**:
- 當使用者調整 platform 高度時，所有已存在的彩球都會自動調整大小
- 新添加的彩球會根據當前 platform 高度設定初始大小

**參考**: [`lottery/script.js:1352-1392`](lottery/script.js:1352-1392)

---

## 問題 4: Chamber 中彩球移動範圍需要對齊 Chamber 大小

### 現況分析
- **lottery-machine-live**: 在 [`startBounceAnimation()`](src/app/lottery-machine-live/page.tsx:363-495) 中，彩球移動範圍使用 `chamberRect.width` 和 `chamberRect.height`
  - 但是 `chamberRef` 是指向 `.lottery-machine` 元素，而不是 `.chamber` 元素
  - 這導致移動範圍可能不正確

- **lottery/**: 在 [`startBounceAnimation()`](lottery/script.js:177-237) 中，使用 `photosContainer.getBoundingClientRect()` 來獲取正確的移動範圍
  - `photosContainer` 是 `.chamber` 內部的容器，有正確的 padding 和邊界

### 修改方案
**目標**: 修正彩球移動範圍的計算，使用正確的容器元素。

**修改位置**: [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx:363-495)

**修改內容**:

1. **添加 chamberContainerRef** (在現有的 ref 聲明處添加):
```typescript
const chamberContainerRef = useRef<HTMLDivElement>(null)
```

2. **修改 JSX 中的 chamber 結構** (line 1430):
```tsx
// 修改前
<div className="chamber" style={{ height: `${trackConfig.chamberHeight}px` }}>
  <div className="chamber-glass"></div>

  <div className="photos-container" ref={photosContainerRef}>
    {avatarBalls.map(ball => (
      // ...
    ))}
  </div>
  // ...
</div>

// 修改後
<div className="chamber" style={{ height: `${trackConfig.chamberHeight}px` }} ref={chamberContainerRef}>
  <div className="chamber-glass"></div>

  <div className="photos-container" ref={photosContainerRef}>
    {avatarBalls.map(ball => (
      // ...
    ))}
  </div>
  // ...
</div>
```

3. **修改 startBounceAnimation 函數** (line 363-495):
```typescript
const startBounceAnimation = () => {
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current)
  }

  const container = photosContainerRef.current
  const chamberContainer = chamberContainerRef.current
  if (!container || !chamberContainer) return

  const photoElements = container.querySelectorAll('.photo-item')
  const containerRect = chamberContainer.getBoundingClientRect() // 使用 chamberContainer 而不是 chamberRef
  if (photoElements.length === 0) return

  // ... 其餘代碼保持不變
}
```

**關鍵改變**:
- 使用 `chamberContainerRef` (指向 `.chamber` 元素) 而不是 `chamberRef` (指向 `.lottery-machine` 元素)
- 這確保彩球移動範圍正確對齊 chamber 的實際大小

**參考**: [`lottery/script.js:177-237`](lottery/script.js:177-237)

---

## 問題 5: 視覺軌道和軌道節點的位置有 shift

### 現況分析
- **lottery-machine-live**: 在 [`generateTrackPath()`](src/app/lottery-machine-live/page.tsx:1084-1178) 中，軌道路徑的計算可能存在坐標轉換問題
  - 軌道節點使用 `transform: translate(-50%, -50%)` 來居中
  - 但路徑計算可能沒有正確考慮這個偏移

- **lottery/**: 在 [`renderSmoothTrack()`](lottery/script.js:1034-1056) 中，軌道路徑的計算考慮了節點的 transform 偏移
  - 使用 `mainRect` 作為坐標系
  - 節點位置使用百分比坐標
  - 路徑計算正確轉換為像素坐標

### 修改方案
**目標**: 修正視覺軌道和軌道節點的位置對齊問題。

**修改位置**: [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx:1084-1178)

**修改內容**:

1. **簡化 generateTrackPath 函數**，參照 lottery/ 的實作:
```typescript
const generateTrackPath = useCallback(() => {
  const { startPoint, endPoint, nodes } = trackConfig

  // 獲取 main-content 的實際尺寸
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return ''

  const mainRect = mainContent.getBoundingClientRect()

  // 構建點數組
  const points = [
    { x: (startPoint.x / 100) * mainRect.width, y: (startPoint.y / 100) * mainRect.height },
    ...nodes.map(n => ({ x: (n.x / 100) * mainRect.width, y: (n.y / 100) * mainRect.height })),
    { x: (endPoint.x / 100) * mainRect.width, y: (endPoint.y / 100) * mainRect.height })
  ]

  if (points.length < 2) return ''

  // 使用 Catmull-Rom 樣條曲線生成平滑路徑
  const pathD = generateCatmullRomPath(points)

  return pathD
}, [trackConfig, windowSize])
```

2. **添加 generateCatmullRomPath 函數** (參照 lottery/):
```typescript
const generateCatmullRomPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  }

  // 添加虛擬點以獲得平滑端點
  const extendedPoints = [
    { x: points[0].x * 2 - points[1].x, y: points[0].y * 2 - points[1].y },
    ...points,
    { x: points[points.length - 1].x * 2 - points[points.length - 2].x, y: points[points.length - 1].y * 2 - points[points.length - 2].y }
  ]

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = extendedPoints[i]
    const p1 = extendedPoints[i + 1]
    const p2 = extendedPoints[i + 2]
    const p3 = extendedPoints[i + 3]

    // Catmull-Rom 到貝茲曲線的轉換
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return path
}
```

3. **確保軌道節點的樣式正確** (檢查 CSS):
```tsx
// 確保節點使用正確的 transform
.track-node {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transform: translate(-50%, -50%); // 這個是正確的
  // ...
}
```

**關鍵改變**:
- 簡化坐標計算，直接使用 `main-content` 作為坐標系
- 移除不必要的坐標轉換和偏移計算
- 使用與 lottery/ 相同的 Catmull-Rom 到貝茲曲線轉換邏輯

**參考**: [`lottery/script.js:1034-1089`](lottery/script.js:1034-1089)

---

## 問題 6: 移除 console 實時反應彩球移動路徑的日誌

### 現況分析
- **lottery-machine-live**: 在 [`animateWinnerSelection()`](src/app/lottery-machine-live/page.tsx:538-659) 中，有大量的 console.log 輸出彩球移動路徑的詳細資訊
  - line 592-594: 輸出路徑點數量和前/後 5 個路徑點
  - line 607-612: 輸出每個線段的詳細資訊（起點、終點、距離、持續時間）
  - line 685-691: 輸出路徑點生成的調試資訊

- **lottery/**: 在 [`animateBallToFunnelThenTrack()`](lottery/script.js:301-336) 和 [`animateSegment()`](lottery/script.js:339-368) 中，沒有這些詳細的 console.log
  - 只有基本的日誌輸出，沒有實時反應每個線段的移動資訊

### 修改方案
**目標**: 移除彩球移動動畫期間的詳細 console.log，減少控制台輸出，提升效能。

**修改位置**: [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx:538-659)

**修改內容**:

1. **移除 animatePath 中的 console.log** (line 599-612):
```typescript
// 修改前
const animatePath = async () => {
  console.log('🚀 開始沿著路徑動畫，總共', waypoints.length - 1, '個線段')

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]
    const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
    const duration = distance * 1.2

    console.log(`📍 線段 ${i + 1}/${waypoints.length - 1}:`, {
      from: { x: Math.round(from.x), y: Math.round(from.y) },
      to: { x: Math.round(to.x), y: Math.round(to.y) },
      distance: Math.round(distance),
      duration: Math.round(duration)
    })

    await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation)
    rotation += distance * 0.5
  }
}

// 修改後
const animatePath = async () => {
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]
    const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
    const duration = distance * 1.2

    await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation)
    rotation += distance * 0.5
  }
}
```

2. **移除 generateWaypoints 中的 console.log** (line 685-691):
```typescript
// 修改前
console.log('📍 路徑點生成：', {
  mainRect: { left: mainRect.left, top: mainRect.top, width: mainRect.width, height: mainRect.height },
  photoRect: { left: photoRect.left, top: photoRect.top, width: photoRect.width, height: photoRect.height },
  initialPos: { x: photoRect.left, y: photoRect.top },
  firstWaypoint: waypoints[1],
  lastWaypoint: waypoints[waypoints.length - 1]
})

// 修改後
// 移除此 console.log
```

3. **移除 animateWinnerSelection 中的其他 console.log** (line 564, 571, 621, 642):
```typescript
// 修改前
console.log('🎯 開始抽獎動畫，中獎者 ID:', winner.id)
console.log('📍 路徑點數量:', waypoints.length)
console.log('📍 前5個路徑點:', waypoints.slice(0, 5))
console.log('📍 最後5個路徑點:', waypoints.slice(-5))
console.log('🎉 動畫完成')
console.log('✅ 中獎者已添加到平台')

// 修改後
// 移除這些 console.log，只保留關鍵錯誤日誌
```

4. **保留必要的錯誤日誌** (line 543, 558):
```typescript
// 保留這些錯誤日誌
console.error('❌ track-container 或 photos-container 不存在')
console.error('❌ 找不到中獎者照片元素，user_id:', winner.user_id)
```

**影響範圍**:
- 減少控制台輸出，提升效能
- 移除不必要的調試資訊
- 保留關鍵的錯誤日誌以便除錯

**參考**: [`lottery/script.js:301-368`](lottery/script.js:301-368)

---

## 實作順序建議

1. **問題 1** (移除自動儲存) - 最簡單，風險最低
2. **問題 2** (修正圓角) - 簡單的 CSS 修改
3. **問題 6** (移除 console.log) - 簡單的清理工作，風險最低
4. **問題 4** (修正彩球移動範圍) - 需要添加 ref，風險中等
5. **問題 3** (實作 ResizeObserver) - 需要添加新的 useEffect，風險中等
6. **問題 5** (修正軌道位置) - 最複雜，需要重構路徑生成邏輯，風險最高

---

## 測試建議

### 問題 1 測試
1. 進入編輯模式
2. 調整 chamber 或 platform 大小
3. 重新整理頁面
4. 確認設定沒有被儲存（恢復為調整前的值）
5. 點擊「儲存設定」按鈕
6. 重新整理頁面
7. 確認設定已被儲存

### 問題 2 測試
1. 查看 chamber 的視覺外觀
2. 確認四個角都有圓角
3. 對比 lottery/ 的 chamber 外觀

### 問題 3 測試
1. 抽出幾個中獎者
2. 調整 platform 高度（在編輯模式下）
3. 確認所有已存在的彩球大小都自動調整
4. 抽出新的中獎者
5. 確認新彩球大小與當前 platform 高度匹配

### 問題 4 測試
1. 調整 chamber 大小（在編輯模式下）
2. 觀察彩球移動範圍
3. 確認彩球不會超出 chamber 邊界
4. 確認彩球可以在整個 chamber 內自由移動

### 問題 5 測試
1. 查看視覺軌道
2. 確認軌道路徑正確穿過所有節點中心
3. 拖曳節點位置
4. 確認軌道路徑即時更新並正確對齊
5. 對比 lottery/ 的軌道外觀

---

## 注意事項

1. **備份**: 在開始修改前，建議先備份現有的 [`page.tsx`](src/app/lottery-machine-live/page.tsx) 檔案
2. **漸進式修改**: 建議一次只修改一個問題，測試確認無誤後再進行下一個
3. **參照 lottery/**: 所有修改都應該參照 [`lottery/`](lottery/) 的實作，確保一致性
4. **響應式設計**: 確保修改後的程式碼在不同螢幕尺寸下都能正常運作
5. **效能**: ResizeObserver 和動畫更新應該注意效能，避免過度渲染

---

## 相關檔案

- [`src/app/lottery-machine-live/page.tsx`](src/app/lottery-machine-live/page.tsx) - 主要修改檔案
- [`lottery/script.js`](lottery/script.js) - 參考實作
- [`lottery/styles.css`](lottery/styles.css) - 參考樣式
- [`src/app/api/lottery-machine/config/route.ts`](src/app/api/lottery-machine/config/route.ts) - API 路由
