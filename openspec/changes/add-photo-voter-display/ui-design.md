## UI 組件設計：照片投票者列表

### 組件結構

```
PhotoDetailModal
├── PhotoDisplay
├── PhotoInfo
├── BlessingMessage
├── Statistics
├── ActionButtons
└── VoterListSection  // 新增組件
    ├── VoterListHeader
    ├── VoterGrid
    │   └── VoterCard (重複)
    └── EmptyState
```

### VoterListSection 組件

#### 位置與布局
- **位置**: 在操作按鈕（設為隱私/下載/刪除/關閉）下方
- **邊距**: 上方 24px 間距，與操作按鈕區分
- **邊框**: 上方 1px 實線邊框（#e5e7eb）

#### 標題區域 (VoterListHeader)
```jsx
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold text-gray-800">
    投票者 ({totalVoters})
  </h3>
  {loading && (
    <div className="flex items-center space-x-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm text-gray-500">載入中...</span>
    </div>
  )}
</div>
```

### VoterGrid 組件

#### 響應式網格布局
```css
/* 桌面版 (>=1024px): 4 欄 */
@media (min-width: 1024px) {
  .voter-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 平板版 (>=768px): 3 欄 */
@media (min-width: 768px) and (max-width: 1023px) {
  .voter-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 手機版 (<768px): 2 欄 */
@media (max-width: 767px) {
  .voter-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

#### 網格容器樣式
```jsx
<div className="grid gap-4 voter-grid">
  {voters.map((voter) => (
    <VoterCard key={voter.lineId} voter={voter} />
  ))}
</div>
```

### VoterCard 組件

#### 卡片結構
```jsx
<div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
  {/* 頭像 */}
  <div className="w-12 h-12 mb-2 relative">
    {voter.avatarUrl ? (
      <img
        src={voter.avatarUrl}
        alt={voter.displayName}
        className="w-full h-full rounded-full object-cover"
        onError={handleAvatarError}
      />
    ) : (
      <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
        <User className="w-6 h-6 text-gray-600" />
      </div>
    )}
  </div>
  
  {/* 名稱 */}
  <p className="text-sm text-gray-700 text-center truncate w-full">
    {voter.displayName}
  </p>
</div>
```

#### 頭像錯誤處理
```jsx
const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
  e.currentTarget.nextElementSibling?.classList.remove('hidden')
}
```

### EmptyState 組件

#### 空狀態設計
```jsx
<div className="text-center py-8">
  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500 text-medium">尚無投票者</p>
  <p className="text-gray-400 text-sm mt-1">
    當有用戶投票時，他們的資訊會顯示在這裡
  </p>
</div>
```

### 載入狀態設計

#### 骨架屏設計
```jsx
<div className="grid gap-4 voter-grid">
  {Array.from({ length: 8 }).map((_, index) => (
    <div key={index} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
      <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-2" />
      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
    </div>
  ))}
</div>
```

### 錯誤狀態設計

#### 錯誤處理組件
```jsx
<div className="text-center py-8">
  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
  <p className="text-red-600 font-medium">載入投票者失敗</p>
  <button
    onClick={onRetry}
    className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
  >
    重試
  </button>
</div>
```

### 互動設計

#### Hover 效果
- **VoterCard**: 背景色從 `bg-gray-50` 變為 `bg-gray-100`
- **過渡動畫**: `transition-colors duration-200`

#### 載入動畫
- **骨架屏**: 使用 `animate-pulse` 效果
- **載入圖標**: 使用 `animate-spin` 效果

### 響應式設計考量

#### 斷點設計
- **手機** (< 768px): 2 欄布局，較大的間距
- **平板** (768px - 1023px): 3 欄布局
- **桌面** (≥ 1024px): 4 欄布局，最佳密度

#### 字體大小調整
- **手機**: 名稱使用 `text-xs`
- **平板/桌面**: 名稱使用 `text-sm`

### 可訪問性考量

#### ARIA 標籤
```jsx
<div
  role="region"
  aria-label={`投票者列表，共 ${totalVoters} 人`}
  aria-busy={loading}
>
  {/* 內容 */}
</div>
```

#### 鍵盤導航
- 投票者卡片應該可以獲得焦點
- 提供適當的焦點指示器

### 效能優化

#### 圖片載入優化
- 使用 `loading="lazy"` 屬性
- 適當的圖片尺寸設定
- 錯誤處理避免重試

#### 虛擬化考慮
- 如果投票者數量超過 50 個，考慮使用虛擬滾動
- 目前決定不實作，但保留未來擴展可能性

### 設計系統整合

#### 色彩使用
- **主要色**: 現有的灰色系統 (`gray-50`, `gray-100`, `gray-700`)
- **強調色**: 紅色用於錯誤狀態 (`red-400`, `red-600`)
- **成功色**: 綠色用於成功狀態（如果需要）

#### 間距系統
- **卡片間距**: `gap-4` (16px)
- **內部間距**: `p-3` (12px)
- **元素間距**: `mb-2` (8px), `mb-3` (12px), `mb-4` (16px)

#### 圓角系統
- **卡片圓角**: `rounded-lg` (8px)
- **頭像圓角**: `rounded-full` (50%)