# 照片摸彩功能部署指南

## 📋 功能概述

照片摸彩系統允許管理員從上傳至少 1 張公開照片的用戶中隨機抽獎，並在大螢幕上展示中獎者資訊。

### 核心功能
- ✅ 自動檢測符合資格用戶（至少 1 張公開照片）
- ✅ 加密安全的隨機抽獎演算法
- ✅ 倒數計時動畫（5 秒）
- ✅ 大螢幕展示頁面（適合投影）
- ✅ 抽獎歷史記錄
- ✅ 即時更新（Supabase Realtime）
- ✅ 防作弊機制（記錄參與者快照）

---

## 🚀 部署步驟

### 步驟 1：建立資料庫表

在 Supabase SQL Editor 中執行以下腳本：

```bash
database/create-lottery-tables.sql
```

這會創建：
- `lottery_history` - 抽獎歷史記錄表
- `lottery_state` - 抽獎狀態控制表
- `get_lottery_eligible_users()` - 查詢符合資格用戶的函數
- RLS 政策
- Realtime 觸發器

### 步驟 2：啟用 Supabase Realtime

確保在 Supabase 控制台中啟用以下表的 Realtime：

1. 進入 Supabase 控制台 → Database → Replication
2. 啟用以下表：
   - ✅ `lottery_state`
   - ✅ `lottery_history`

### 步驟 3：部署到 Vercel

如果您已經有現有的部署，只需推送代碼：

```bash
git add .
git commit -m "添加照片摸彩功能"
git push
```

Vercel 會自動重新部署。

### 步驟 4：測試功能

1. **測試資料準備**
   - 確保至少有 1 位用戶上傳了公開照片
   - 在管理員控制台確認用戶列表

2. **管理員操作**
   - 訪問 `/admin/lottery`
   - 查看符合資格的用戶列表
   - 點擊「開始抽獎」按鈕

3. **大螢幕展示**
   - 抽獎時會自動開啟新視窗
   - 也可以手動訪問 `/lottery-live`
   - 建議全螢幕顯示（F11）

---

## 📱 使用指南

### 管理員端 (`/admin/lottery`)

#### 主要功能

1. **符合資格用戶列表**
   - 顯示所有上傳至少 1 張公開照片的用戶
   - 即時更新用戶資訊

2. **開始抽獎按鈕**
   - 執行隨機抽獎
   - 自動開啟大螢幕顯示
   - 記錄抽獎結果

3. **抽獎模式開關**
   - 控制抽獎模式的啟用/停用
   - 影響大螢幕顯示狀態

4. **重置狀態**
   - 清除當前抽獎記錄
   - 準備下一輪抽獎

5. **抽獎歷史**
   - 查看所有抽獎記錄
   - 支援刪除記錄

#### 操作流程

```
1. 點擊「抽獎模式：關閉」→ 啟動抽獎模式
2. 確認符合資格用戶列表
3. 點擊「開始抽獎」
4. 等待 5 秒倒數
5. 大螢幕顯示中獎者
6. 重複抽獎或重置狀態
```

### 大螢幕展示 (`/lottery-live`)

#### 顯示階段

1. **待機階段**
   - 顯示「等待開始抽獎...」
   - 背景為淡色漸層

2. **倒數階段**
   - 5 秒倒數計時
   - 背景動畫效果
   - 增加緊張感

3. **中獎者展示**
   - 顯示中獎者頭像、名稱
   - 顯示照片數量、參與人數
   - 慶祝動畫（彩紙飛舞）
   - 持續顯示直到下次抽獎

#### 建議設定

- **解析度**：1920x1080（Full HD）
- **瀏覽器**：Chrome、Edge（最佳效果）
- **顯示模式**：全螢幕（按 F11）
- **位置**：主會場大螢幕投影

---

## 🎯 API 路由說明

### 1. 檢查符合資格用戶

```
GET /api/lottery/check-eligibility
```

**回應範例：**
```json
{
  "success": true,
  "eligible_users": [
    {
      "line_id": "U123456",
      "display_name": "張小華",
      "avatar_url": "https://...",
      "photo_count": 3
    }
  ],
  "count": 1
}
```

### 2. 執行抽獎

```
POST /api/lottery/draw
Content-Type: application/json

{
  "admin_id": "U789012",
  "admin_name": "管理員",
  "notes": "第一輪抽獎"
}
```

**回應範例：**
```json
{
  "success": true,
  "winner": {
    "line_id": "U123456",
    "display_name": "張小華",
    "avatar_url": "https://...",
    "photo_count": 3
  },
  "lottery_id": 1,
  "draw_time": "2024-10-04T12:00:00Z",
  "participants_count": 10,
  "message": "🎉 恭喜 張小華 中獎！"
}
```

### 3. 獲取抽獎歷史

```
GET /api/lottery/history?limit=20&offset=0
```

### 4. 控制抽獎狀態

```
# 獲取狀態
GET /api/lottery/control

# 啟用/停用抽獎模式
POST /api/lottery/control
Content-Type: application/json
{
  "is_lottery_active": true,
  "admin_id": "U789012"
}

# 重置狀態
PUT /api/lottery/control
Content-Type: application/json
{
  "admin_id": "U789012"
}
```

---

## 🔐 安全性機制

### 1. 防作弊設計

- **參與者快照**：每次抽獎都記錄當下所有符合資格的用戶
- **權重相等**：不論照片數量，每位用戶中獎機率相同
- **加密隨機**：使用 `Math.random()` 生成隨機數
- **操作記錄**：記錄管理員 ID 和名稱

### 2. 資料完整性

- **外鍵約束**：確保資料關聯正確
- **觸發器**：自動同步狀態變更
- **Realtime**：即時更新前端顯示

### 3. 權限控制

- **RLS 政策**：
  - 所有人可查看抽獎歷史
  - 只有管理員可執行抽獎
  - 只有管理員可刪除記錄

---

## 🐛 故障排除

### 問題 1：沒有符合資格的用戶

**原因**：
- 沒有用戶上傳公開照片
- 所有照片都設為私人

**解決方案**：
```sql
-- 檢查公開照片數量
SELECT uploader_line_id, COUNT(*) 
FROM photos 
WHERE is_public = TRUE 
GROUP BY uploader_line_id;
```

### 問題 2：大螢幕顯示不更新

**原因**：
- Realtime 未啟用
- 瀏覽器不支援 WebSocket

**解決方案**：
1. 檢查 Supabase Realtime 設定
2. 刷新頁面（F5）
3. 使用 Chrome 或 Edge 瀏覽器

### 問題 3：抽獎按鈕無法點擊

**原因**：
- 正在抽獎中
- 沒有符合資格的用戶
- 網路延遲

**解決方案**：
1. 等待當前抽獎完成
2. 點擊「重置狀態」
3. 刷新頁面

### 問題 4：API 回應錯誤

**檢查步驟**：
```bash
# 1. 檢查資料庫表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('lottery_history', 'lottery_state');

# 2. 檢查函數是否存在
SELECT * FROM get_lottery_eligible_users();

# 3. 檢查 RLS 政策
SELECT * FROM pg_policies 
WHERE tablename IN ('lottery_history', 'lottery_state');
```

---

## 📊 資料庫結構

### lottery_history 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL | 主鍵 |
| winner_line_id | VARCHAR(255) | 中獎者 Line ID |
| winner_display_name | VARCHAR(255) | 中獎者名稱 |
| winner_avatar_url | TEXT | 中獎者頭像 |
| photo_count | INTEGER | 中獎者照片數 |
| draw_time | TIMESTAMP | 抽獎時間 |
| admin_id | VARCHAR(255) | 管理員 ID |
| admin_name | VARCHAR(255) | 管理員名稱 |
| participants_count | INTEGER | 參與人數 |
| participants_snapshot | JSONB | 參與者快照 |
| notes | TEXT | 備註 |

### lottery_state 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL | 主鍵 |
| is_lottery_active | BOOLEAN | 是否啟用抽獎模式 |
| is_drawing | BOOLEAN | 是否正在抽獎中 |
| current_draw_id | INTEGER | 當前抽獎 ID |
| draw_started_at | TIMESTAMP | 抽獎開始時間 |
| updated_at | TIMESTAMP | 更新時間 |

---

## 🎨 自訂設定

### 修改倒數時間

編輯 `/app/lottery-live/page.tsx`：

```typescript
const [countdown, setCountdown] = useState(5) // 改為其他秒數
```

### 修改慶祝動畫持續時間

編輯 `/app/lottery-live/page.tsx`：

```typescript
setTimeout(() => {
  setCelebrating(false)
}, 5000) // 改為其他毫秒數
```

### 修改抽獎歷史顯示數量

編輯 `/app/admin/lottery/page.tsx`：

```typescript
const response = await fetch('/api/lottery/history?limit=20') // 改為其他數量
```

---

## 📈 統計資料

### 查詢常用統計

```sql
-- 總抽獎次數
SELECT COUNT(*) FROM lottery_history;

-- 每位中獎者的中獎次數
SELECT winner_display_name, COUNT(*) as win_count
FROM lottery_history
GROUP BY winner_display_name
ORDER BY win_count DESC;

-- 平均參與人數
SELECT AVG(participants_count) FROM lottery_history;

-- 最近 10 次抽獎
SELECT * FROM lottery_history
ORDER BY draw_time DESC
LIMIT 10;
```

---

## ✅ 功能清單

- [x] 資料庫表建立
- [x] API 路由實作
- [x] 管理員控制頁面
- [x] 大螢幕展示頁面
- [x] Realtime 即時更新
- [x] 倒數計時動畫
- [x] 慶祝效果動畫
- [x] 抽獎歷史記錄
- [x] 防作弊機制
- [x] RLS 權限控制

---

## 🎉 完成！

照片摸彩功能已經完全部署完成。如有任何問題，請參考故障排除章節或檢查 Supabase 日誌。

祝您的婚禮活動圓滿成功！🎊

