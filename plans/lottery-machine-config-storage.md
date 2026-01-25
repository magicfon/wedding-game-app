# 彩票機設定儲存功能實作計劃

## 概述
為彩票機動畫模式添加設定儲存功能，允許用戶儲存和載入軌道和物理參數設定。

## 資料庫遷移

### 新增欄位：lottery_machine_config
在 `lottery_state` 表中添加 `lottery_machine_config` 欄位，使用 JSONB 格式儲存設定。

```sql
-- 為 lottery_state 表添加彩票機設定欄位
-- 執行位置: Supabase SQL Editor

-- 1. 添加軌道設定欄位
ALTER TABLE lottery_state
ADD COLUMN IF NOT EXISTS lottery_machine_config JSONB DEFAULT '{
  "track": {
    "nodes": [
      { "id": 1, "x": 95, "y": 75 },
      { "id": 2, "x": 95, "y": 55 },
      { "id": 3, "x": 5, "y": 55 },
      { "id": 4, "x": 5, "y": 25 },
      { "id": 5, "x": 25, "y": 25 }
    ],
    "startPoint": { "x": 50, "y": 75 },
    "endPoint": { "x": 15, "y": 8 }
  },
  "physics": {
    "airForce": 0.8,
    "lateralAirForce": 0.2,
    "gravity": 0.35,
    "friction": 0.995,
    "bounceFactor": 0.85,
    "maxVelocity": 15,
    "minVelocity": 4,
    "turbulence": 0.4
  }
}'::jsonb;

-- 2. 添加欄位註釋
COMMENT ON COLUMN lottery_state.lottery_machine_config IS '彩票機設定，包含軌道和物理參數';

-- 3. 確保現有記錄有預設值
UPDATE lottery_state
SET lottery_machine_config = '{
  "track": {
    "nodes": [
      { "id": 1, "x": 95, "y": 75 },
      { "id": 2, "x": 95, "y": 55 },
      { "id": 3, "x": 5, "y": 55 },
      { "id": 4, "x": 5, "y": 25 },
      { "id": 5, "x": 25, "y": 25 }
    ],
    "startPoint": { "x": 50, "y": 75 },
    "endPoint": { "x": 15, "y": 8 }
  },
  "physics": {
    "airForce": 0.8,
    "lateralAirForce": 0.2,
    "gravity": 0.35,
    "friction": 0.995,
    "bounceFactor": 0.85,
    "maxVelocity": 15,
    "minVelocity": 4,
    "turbulence": 0.4
  }
}'::jsonb
WHERE lottery_machine_config IS NULL;

-- 4. 驗證
SELECT id, lottery_machine_config FROM lottery_state;
```

## API 修改

### 修改 `/api/lottery/control/route.ts`

#### GET 路由
在 GET 路由中添加 `lottery_machine_config` 欄位的讀取：

```typescript
// 在返回的 JSON 中添加 lottery_machine_config
return NextResponse.json({
  success: true,
  state: state || {
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  },
  current_draw: currentDraw,
  current_draws: currentDraws,
  lottery_machine_config: state?.lottery_machine_config || null // 新增
})
```

#### POST 路由
在 POST 路由中添加 `lottery_machine_config` 欄位的更新：

```typescript
const { is_lottery_active, max_photos_for_lottery, notify_winner_enabled, winners_per_draw, admin_id, lottery_machine_config } = body

// 在 updateFields 中添加
if (lottery_machine_config) {
  updateFields.lottery_machine_config = lottery_machine_config
  console.log('  - 彩票機設定已更新')
}
```

## 前端組件修改

### 修改 `LotteryMachineLottery.tsx`

#### 1. 添加從 API 載入設定的功能
在組件中添加 `useEffect` 從 API 載入設定：

```typescript
useEffect(() => {
  // 從 API 載入彩票機設定
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/lottery/control')
      const data = await response.json()
      
      if (data.success && data.lottery_machine_config) {
        const config = data.lottery_machine_config
        
        // 更新軌道設定
        if (config.track) {
          if (config.track.nodes) setTrackNodes(config.track.nodes)
          if (config.track.startPoint) setStartPoint(config.track.startPoint)
          if (config.track.endPoint) setEndPoint(config.track.endPoint)
        }
        
        // 更新物理參數
        if (config.physics) {
          Object.assign(PHYSICS, config.physics)
        }
      }
    } catch (error) {
      console.error('載入彩票機設定失敗:', error)
    }
  }
  
  loadConfig()
}, [])
```

#### 2. 添加儲存設定到 API 的功能
在組件中添加 `saveConfig` 函數：

```typescript
const saveConfig = async () => {
  try {
    const config = {
      track: {
        nodes: trackNodes,
        startPoint,
        endPoint
      },
      physics: PHYSICS
    }
    
    const response = await fetch('/api/lottery/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lottery_machine_config: config,
        admin_id: 'system' // 或從 props 傳入
      })
    })
    
    const data = await response.json()
    if (data.success) {
      alert('設定已儲存到資料庫')
    } else {
      alert('儲存失敗: ' + data.error)
    }
  } catch (error) {
    console.error('儲存彩票機設定失敗:', error)
    alert('儲存失敗')
  }
}
```

#### 3. 添加 localStorage 儲存功能
在組件中添加 localStorage 支援：

```typescript
// 從 localStorage 載入設定
useEffect(() => {
  const savedConfig = localStorage.getItem('lottery_machine_config')
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig)
      
      if (config.track) {
        if (config.track.nodes) setTrackNodes(config.track.nodes)
        if (config.track.startPoint) setStartPoint(config.track.startPoint)
        if (config.track.endPoint) setEndPoint(config.track.endPoint)
      }
      
      if (config.physics) {
        Object.assign(PHYSICS, config.physics)
      }
    } catch (error) {
      console.error('從 localStorage 載入設定失敗:', error)
    }
  }
}, [])

// 儲存到 localStorage
const saveToLocalStorage = () => {
  const config = {
    track: {
      nodes: trackNodes,
      startPoint,
      endPoint
    },
    physics: PHYSICS
  }
  
  localStorage.setItem('lottery_machine_config', JSON.stringify(config))
  alert('設定已儲存到瀏覽器')
}
```

#### 4. 在編輯器面板中添加儲存/載入按鈕
在編輯器面板中添加儲存和載入按鈕：

```typescript
{/* 設定操作按鈕 */}
<div className="mt-4 space-y-2">
  <button
    onClick={saveToLocalStorage}
    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
  >
    💾 儲存到瀏覽器
  </button>
  <button
    onClick={saveConfig}
    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold"
  >
    ☁️ 儲存到資料庫
  </button>
  <button
    onClick={() => {
      if (confirm('確定要重置為預設設定嗎？')) {
        localStorage.removeItem('lottery_machine_config')
        window.location.reload()
      }
    }}
    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
  >
    🔄 重置為預設
  </button>
</div>
```

## 實作步驟

1. **資料庫遷移**
   - 在 Supabase SQL Editor 中執行上面的 SQL 腳本
   - 驗證 `lottery_machine_config` 欄位已正確添加

2. **API 修改**
   - 修改 `/api/lottery/control/route.ts` 的 GET 路由
   - 修改 `/api/lottery/control/route.ts` 的 POST 路由

3. **前端組件修改**
   - 修改 `LotteryMachineLottery.tsx` 添加從 API 載入設定的功能
   - 修改 `LotteryMachineLottery.tsx` 添加儲存設定到 API 的功能
   - 修改 `LotteryMachineLottery.tsx` 添加 localStorage 支援
   - 修改 `LotteryMachineLottery.tsx` 在編輯器面板中添加儲存/載入按鈕

4. **測試**
   - 測試從 API 載入設定
   - 測試儲存設定到 API
   - 測試從 localStorage 載入設定
   - 測試儲存設定到 localStorage
   - 測試重置為預設設定

## 注意事項

1. **權限控制**
   - 只有管理員可以更新 `lottery_machine_config` 欄位
   - 所有人都可以查看 `lottery_machine_config` 欄位

2. **設定優先級**
   - API 設定優先於 localStorage 設定
   - 如果 API 中沒有設定，則使用 localStorage 中的設定
   - 如果都沒有，則使用預設設定

3. **設定格式**
   - 使用 JSONB 格式儲存設定
   - 設定包含 `track` 和 `physics` 兩個主要部分
   - `track` 包含 `nodes`、`startPoint`、`endPoint`
   - `physics` 包含所有物理參數
