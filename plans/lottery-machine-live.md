# 彩球機頁面實施計劃

## 專案概述

將 `lottery/` 資料夾中的完整彩球機功能整合到 Next.js 專案中，創建一個新的彩球機頁面（lottery-machine-live），使用 photo-wall 的照片作為彩球資料來源。

## 功能需求

### 從 lottery/ 資料夾整合的功能

1. **軌道編輯器** - 拖曳節點編輯軌道路徑
2. **物理參數設定** - 重力、氣流力、側向氣流力、最大速度
3. **腔體和平台樣式設定** - 可拖曳調整大小和位置
4. **彩球大小調整** - 彩球直徑調整
5. **物理動畫** - 彩球彈跳、旋轉動畫
6. **氣泡效果** - 底部氣泡上升效果
7. **軌道動畫** - 中獎照片沿軌道滑動
8. **慶祝效果** - 彩帶慶祝動畫
9. **設定儲存** - 自動儲存到資料庫

### 從 photo-wall 整合的功能

1. **照片來源** - 從 photos 表獲取用戶上傳的照片
2. **照片格式轉換** - 轉換為彩球機相容格式
3. **用戶資訊** - 用戶 LINE ID、顯示名稱、頭像

### 其他功能

1. **中獎 LINE 通知** - 發送通知給中獎者
2. **共用歷史表** - 與原本照片摸彩共用 lottery_history 表

## 專案結構

```
src/app/
├── api/
│   └── lottery-machine/              # 彩球機 API（與 lottery 完全分開）
│       ├── photos/route.ts             # 從 photo/list 獲取照片
│       ├── config/route.ts            # 儲存/載入彩球機設定到資料庫
│       ├── draw/route.ts              # 彩球機抽獎
│       └── notify-winner/route.ts     # 中獎 LINE 通知
├── admin/
│   └── lottery/
│       └── lottery-machine-live/      # 彩球機管理頁面
│           └── page.tsx
└── lottery-machine-live/              # 彩球機展示頁面
    └── page.tsx
```

## 資料庫表結構

### 彩球機狀態表

```sql
CREATE TABLE lottery_machine_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_lottery_active BOOLEAN DEFAULT false,
  is_drawing BOOLEAN DEFAULT false,
  current_draw_id INTEGER NULL,
  max_photos_for_lottery INTEGER DEFAULT 5,
  animation_mode TEXT DEFAULT 'lottery_machine',
  notify_winner_enabled BOOLEAN DEFAULT true,
  winners_per_draw INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 彩球機設定表（儲存軌道編輯器設定）

```sql
CREATE TABLE lottery_machine_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  track_config JSONB NOT NULL,
  physics JSONB NOT NULL,
  chamber_style JSONB NOT NULL,
  platform_style JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 中獎歷史表（與原本照片摸彩共用）

使用現有的 `lottery_history` 表，不需要創建新表。

## API 路由設計

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/lottery-machine/photos` | GET | 獲取 photo-wall 照片（轉換格式） |
| `/api/lottery-machine/config` | GET | 獲取彩球機設定（軌道、物理、樣式） |
| `/api/lottery-machine/config` | POST | 儲存彩球機設定到資料庫 |
| `/api/lottery-machine/draw` | POST | 執行抽獎（隨機選擇照片） |
| `/api/lottery-machine/notify-winner` | POST | 發送 LINE 通知給中獎者 |

## 資料流程圖

```mermaid
flowchart TD
    A[彩球機管理頁面] --> B[/api/lottery-machine/config]
    A --> C[/api/lottery-machine/draw]
    
    B --> D[lottery_machine_config 表]
    
    C --> E[lottery_history 表]
    C --> F[/api/lottery-machine/notify-winner]
    
    F --> G[LINE Bot]
    
    H[彩球機展示頁面] --> I[/api/lottery-machine/photos]
    I --> J[/api/photo/list]
    J --> K[photos 表]
    
    H --> L[Realtime 訂閱]
    L --> C
    L --> E
```

## 實施步驟

1. **創建資料庫遷移腳本** - 創建兩個新表（lottery_machine_state、lottery_machine_config）
2. **創建 API 路由** - photos、config、draw、notify-winner
3. **創建管理頁面** - 整合軌道編輯器和所有設定
4. **創建展示頁面** - 整合物理動畫和 photo-wall 照片
5. **測試功能** - 驗證所有功能正常運作

## 關鍵設計決策

1. **完全整合** lottery/ 資料夾的所有功能
2. **使用 photo-wall** 作為彩球資料來源（和原本照片摸彩一樣）
3. **支援 LINE 通知**（照片有用戶資訊）
4. **共用歷史表**（lottery_history）
5. **與現有功能分開**，獨立的 API 和資料庫表

## 參考檔案

- `lottery/index.html` - 主頁面結構
- `lottery/script.js` - JavaScript 邏輯（物理動畫、軌道編輯器等）
- `lottery/styles.css` - 樣式表
- `lottery/config.json` - 設定檔案範例
- `src/app/api/photo/list/route.ts` - photo-wall API
- `src/app/api/lottery/photos/route.ts` - 照片摸彩照片 API
- `src/app/api/lottery/draw/route.ts` - 抽獎邏輯
- `src/app/api/lottery/notify-winner/route.ts` - LINE 通知邏輯
