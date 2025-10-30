# 照片牆橫向排序瀑布流設計

## 問題分析

### 當前實現問題
1. **CSS Columns 垂直排序**：目前使用 `columns-3 sm:columns-4 md:columns-5 lg:columns-4 xl:columns-5` 實現瀑布流
2. **無限滾動打亂排序**：每次載入新照片時，CSS 會自動重新分配到各列，導致排序混亂
3. **用戶體驗問題**：照片順序不斷變化，影響瀏覽體驗

### 當前排序方式
```
初始載入 (12張照片，3列):
1   5   9
2   6   10
3   7   11
4   8   12

載入更多後 (24張照片):
1   9   17
2   10  18
3   11  19
4   12  20
5   13  21
6   14  22
7   15  23
8   16  24
```

## 解決方案設計

### 核心概念
**預分配演算法**：在渲染前將照片按橫向順序分配到各列，然後使用 CSS Grid 或 Flexbox 進行佈局。

### 目標排序方式
```
初始載入 (12張照片，3列):
1   2   3
4   5   6
7   8   9
10  11  12

載入更多後 (24張照片):
1   2   3   4   5
6   7   8   9   10
11  12  13  14  15
16  17  18  19  20
21  22  23  24
```

## 演算法設計

### 1. 響應式列數計算
```typescript
const getColumnCount = (width: number): number => {
  if (width < 640) return 3;   // sm
  if (width < 1024) return 4;  // md
  if (width < 1280) return 4;  // lg
  return 5;                     // xl
}
```

### 2. 照片分配演算法
```typescript
const distributePhotosToColumns = (
  photos: Photo[], 
  columnCount: number
): Photo[][] => {
  const columns: Photo[][] = Array.from({ length: columnCount }, () => []);
  
  photos.forEach((photo, index) => {
    const columnIndex = index % columnCount;
    const rowIndex = Math.floor(index / columnCount);
    
    // 確保列數組足夠長
    if (!columns[columnIndex]) {
      columns[columnIndex] = [];
    }
    
    columns[columnIndex].push(photo);
  });
  
  return columns;
};
```

### 3. 渲染邏輯
```typescript
const renderPhotoWall = (photos: Photo[]) => {
  const columnCount = getColumnCount(window.innerWidth);
  const columns = distributePhotosToColumns(photos, columnCount);
  
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col space-y-3 sm:space-y-4">
          {column.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      ))}
    </div>
  );
};
```

## 實現策略

### 階段一：基礎實現
1. 創建照片分配工具函數
2. 實現響應式列數計算
3. 修改照片牆組件使用新演算法

### 階段二：優化體驗
1. 添加載入動畫和過渡效果
2. 實現照片高度預測，減少佈局跳動
3. 優化無限滾動性能

### 階段三：增強功能
1. 添加佈局切換選項（網格/瀑布流）
2. 實現照片拖拽排序
3. 添加排序方式選擇（時間/票數/自定義）

## 技術考量

### 性能優化
1. **虛擬滾動**：大量照片時使用虛擬滾動
2. **圖片懶加載**：只載入可見區域的照片
3. **記憶體管理**：及時清理不可見的照片元素

### 響應式設計
1. **斷點適配**：確保在不同螢幕尺寸下正確顯示
2. **動態列數**：根據容器寬度動態調整列數
3. **圖片尺寸**：根據列寬選擇合適的圖片尺寸

### 錯誤處理
1. **圖片載入失敗**：提供重試機制和佔位符
2. **網路錯誤**：優雅處理網路中斷情況
3. **邊界情況**：處理空數據、單張照片等特殊情況

## 實現細節

### 狀態管理
```typescript
interface PhotoWallState {
  photos: Photo[];
  displayedPhotos: Photo[];
  columns: Photo[][];
  columnCount: number;
  loading: boolean;
  loadingMore: boolean;
  page: number;
}
```

### 事件處理
```typescript
const handleResize = useCallback(() => {
  const newColumnCount = getColumnCount(window.innerWidth);
  if (newColumnCount !== columnCount) {
    setColumnCount(newColumnCount);
    // 重新分配照片到列
    const newColumns = distributePhotosToColumns(displayedPhotos, newColumnCount);
    setColumns(newColumns);
  }
}, [columnCount, displayedPhotos]);
```

### 無限滾動優化
```typescript
const loadMorePhotos = useCallback(async () => {
  if (loadingMore) return;
  
  setLoadingMore(true);
  try {
    const newPhotos = await fetchPhotos(page + 1);
    const allPhotos = [...photos, ...newPhotos];
    const newColumns = distributePhotosToColumns(allPhotos, columnCount);
    
    setPhotos(allPhotos);
    setColumns(newColumns);
    setPage(page + 1);
  } catch (error) {
    console.error('載入更多照片失敗:', error);
  } finally {
    setLoadingMore(false);
  }
}, [loadingMore, photos, page, columnCount]);
```

## 測試策略

### 單元測試
1. 照片分配演算法正確性
2. 響應式列數計算
3. 邊界情況處理

### 集成測試
1. 無限滾動流程
2. 螢幕尺寸變化適應
3. 圖片載入失敗處理

### 用戶體驗測試
1. 載入性能測試
2. 互動流暢度測試
3. 不同設備適配測試

## 部署考量

### 漸進式部署
1. 先在測試環境驗證功能
2. 使用功能開關控制新舊版本
3. 監控性能指標和用戶反饋

### 回滾計劃
1. 保留原有實現作為備選
2. 準備快速回滾腳本
3. 設置監控警報機制

## 總結

這個設計通過預分配演算法解決了照片牆橫向排序問題，同時保持了瀑布流的視覺效果。實現時需要考慮性能、響應式設計和用戶體驗等多個方面，確保解決方案的穩定性和可擴展性。