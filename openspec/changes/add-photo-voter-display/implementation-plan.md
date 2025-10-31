# 照片投票者顯示功能 - 實作計劃

## 概述

這個功能將在照片管理介面 (`/admin/photos`) 中新增投票者顯示功能。當管理員點擊照片放大查看詳情時，在操作按鈕下方會顯示所有投票給這張照片的 LINE 用戶名稱和大頭貼。

## 技術架構

### 後端架構
```
/api/admin/photos/voters/route.ts
├── 管理員權限驗證
├── 照片 ID 參數驗證
├── 資料庫查詢 (JOIN votes + users)
├── 錯誤處理
└── JSON 回應格式化
```

### 前端架構
```
src/app/admin/photos/page.tsx
├── PhotoDetailModal (修改)
│   ├── 現有內容
│   └── VoterListSection (新增)
│       ├── VoterListHeader
│       ├── VoterGrid
│       │   └── VoterCard (重複)
│       ├── EmptyState
│       └── LoadingState
```

## 實作步驟

### 階段 1: 後端 API 開發

#### 1.1 創建 API 端點
- 檔案: `src/app/api/admin/photos/voters/route.ts`
- 方法: `GET`
- 參數: `photoId` (query string)
- 權限: 管理員驗證

#### 1.2 資料庫查詢設計
```sql
SELECT 
  u.line_id,
  u.display_name,
  u.avatar_url,
  v.created_at
FROM votes v
JOIN users u ON v.voter_line_id = u.line_id
WHERE v.photo_id = $1
ORDER BY v.created_at DESC
```

#### 1.3 回應格式
```json
{
  "success": true,
  "data": {
    "photoId": 123,
    "voters": [
      {
        "lineId": "U123...",
        "displayName": "張小明",
        "avatarUrl": "https://..."
      }
    ],
    "totalVoters": 5
  }
}
```

### 階段 2: 前端組件開發

#### 2.1 修改 PhotoDetailModal
- 位置: `src/app/admin/photos/page.tsx` (第 509-633 行)
- 在操作按鈕下方新增投票者區塊
- 新增狀態管理: `voters`, `votersLoading`, `votersError`

#### 2.2 創建 VoterListSection 組件
```jsx
const VoterListSection = ({ photoId }) => {
  const [voters, setVoters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // API 呼叫邏輯
  // 載入狀態處理
  // 錯誤處理
  // 渲染投票者網格
}
```

#### 2.3 實作響應式網格
- 桌面版: 4 欄
- 平板版: 3 欄
- 手機版: 2 欄

### 階段 3: 整合與測試

#### 3.1 API 整合
- 在照片詳情打開時呼叫投票者 API
- 處理載入和錯誤狀態
- 更新 UI 狀態

#### 3.2 測試案例
- 有投票者的照片
- 無投票者的照片
- API 錯誤情況
- 網路錯誤情況
- 大量投票者的顯示效果

## 檔案變更清單

### 新增檔案
- `src/app/api/admin/photos/voters/route.ts` - API 端點

### 修改檔案
- `src/app/admin/photos/page.tsx` - 新增投票者列表顯示

## 資料庫考量

### 現有索引利用
- `idx_votes_photo_id` - 用於查詢特定照片的投票
- `users.line_id` - 主鍵查詢

### 效能優化
- 只選擇必要的欄位
- 使用適當的 JOIN 查詢
- 考慮大量投票者的情況

## 安全性考量

### 權限控制
- API 端點需要管理員權限
- 使用現有的權限驗證機制
- 防止未授權存取用戶資訊

### 資料保護
- 只顯示必要的用戶資訊
- 不暴露敏感的個人資訊
- 遵循隱私保護原則

## 使用者體驗設計

### 載入體驗
- 顯示骨架屏載入動畫
- 提供清晰的載入指示
- 避免介面跳動

### 錯誤處理
- 友好的錯誤訊息
- 提供重試選項
- 優雅的降級處理

### 響應式設計
- 適配不同螢幕尺寸
- 保持一致的視覺層次
- 確保觸控友好

## 部署考量

### 環境變數
- 無需新的環境變數
- 使用現有的 Supabase 配置

### 向後相容性
- 不影響現有功能
- 漸進式增強
- 保持 API 一致性

## 未來擴展可能性

### 功能擴展
- 投票時間顯示
- 投票者統計資訊
- 投票趨勢分析

### 效能優化
- 投票者資訊快取
- 分頁載入
- 虛擬滾動

## 驗收標準

### 功能驗收
- [ ] 管理員可以查看照片的投票者列表
- [ ] 投票者顯示正確的頭像和名稱
- [ ] 無投票者時顯示適當的空狀態
- [ ] 載入和錯誤狀態正確處理

### 效能驗收
- [ ] API 回應時間 < 500ms
- [ ] 介面載入流暢無延遲
- [ ] 大量投票者時仍保持良好效能

### 安全驗收
- [ ] 非管理員無法存取投票者資訊
- [ ] 用戶資訊不會洩露給未授權者
- [ ] 符合資料保護要求

## 風險評估

### 高風險
- 無

### 中風險
- 大量投票者可能影響載入效能
  - 緩解：實作適當的查詢優化

### 低風險
- 頭像載入失敗
  - 緩解：實作預設圖標顯示
- 網路錯誤
  - 緩解：實作重試機制

## 總結

這個實作計劃提供了一個完整、安全、高效的照片投票者顯示功能。透過仔細的設計和規劃，確保功能符合用戶需求，同時保持系統的穩定性和可維護性。