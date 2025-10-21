## Context
目前婚禮互動遊戲系統的後台管理頁面使用了不一致的選單實現。AdminLayout 組件提供了漢堡選單功能，但在桌面 Chrome 瀏覽器中存在顯示問題，選單與主內容分開顯示。同時，部分管理頁面（如 dashboard、questions、photos）沒有使用 AdminLayout，而是實現了自己的 header，導致用戶體驗不一致。

## Goals / Non-Goals
- Goals:
  - 統一所有後台管理頁面的選單體驗
  - 修復漢堡選單在桌面 Chrome 瀏覽器的顯示問題
  - 確保選單在所有設備和瀏覽器上正常工作
  - 減少代碼重複，提高維護性
  - 提供一致的管理員導航體驗

- Non-Goals:
  - 不改變選單的功能和鏈接結構
  - 不修改選單的設計風格和顏色
  - 不添加新的選單項目或功能

## Decisions
- Decision: 使用 AdminLayout 組件作為所有後台頁面的統一佈局
  - 理由: 已經存在且功能完整，只需要修復顯示問題
  - 替代方案: 創建新的佈局組件，使用第三方導航庫

- Decision: 優先修復 Chrome 瀏覽器的顯示問題
  - 理由: Chrome 是最常用的桌面瀏覽器，影響用戶體驗最嚴重
  - 替代方案: 先統一頁面佈局，再處理瀏覽器兼容性

- Decision: 保持現有的選單項目和結構
  - 理由: 避免影響現有用戶的使用習慣
  - 替代方案: 重新設計選單結構和分類

## 技術分析

### 根本問題分析
經過多次嘗試，發現問題的根源是 AdminLayout 組件的佈局結構存在根本性問題。所有使用 AdminLayout 的頁面都表現出「左上右下」的問題，表明問題不在特定頁面，而在 AdminLayout 組件本身。

### 問題原因
1. **固定定位衝突**: 選單使用 `fixed` 定位導致其脫離正常文檔流
2. **Flexbox 上下文問題**: 根容器和選單的定位方式產生衝突
3. **CSS 類別複雜性**: 過多的響應式類別組合導致不可預測的行為
4. **Tailwind CSS 特定問題**: 某些 Tailwind 類別組合在 Chrome 中的渲染問題

### 新的修復策略
1. **完全重寫佈局結構**: 使用最簡單直接的 HTML 結構
2. **分離桌面和移動版**: 完全分離兩種版本的實現
3. **避免複雜定位**: 使用最簡單的定位方式
4. **測試驅動開發**: 每次修改後立即測試

### 推薦的佈局結構
```jsx
// 桌面版：簡單的兩列佈局
<div className="flex h-screen">
  <div className="w-64 bg-white shadow-lg"> {/* 選單 */} </div>
  <div className="flex-1 bg-gray-100"> {/* 內容 */} </div>
</div>

// 移動版：選單覆蓋層
<div className="relative h-screen">
  <div className="bg-gray-100 min-h-screen"> {/* 內容 */} </div>
  {isMenuOpen && (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-64 bg-white shadow-lg"> {/* 選單 */} </div>
      <div className="flex-1 bg-black bg-opacity-50" /> {/* 遮罩 */}
    </div>
  )}
</div>
```

## Risks / Trade-offs
- [破壞性變更風險] → 逐步遷移頁面，保持向後兼容
- [瀏覽器兼容性風險] → 在多個瀏覽器中充分測試
- [用戶體驗暫時下降] → 先在開發環境測試，確保無問題後再部署
- [代碼複雜度增加] → 保持代碼簡潔，添加適當註釋

## Migration Plan
1. **階段一**: 修復 AdminLayout 組件的顯示問題
2. **階段二**: 逐個遷移管理頁面使用 AdminLayout
3. **階段三**: 清理重複代碼和優化性能
4. **階段四**: 全面測試和驗證

回滾計劃：
- 保留原始頁面的備份
- 可以通過功能開關快速回滾到原始佈局
- 分階段部署，便於快速定位問題

## Open Questions
- 是否需要為不同的管理員角色提供不同的選單項目？
- 選單是否需要支持摺疊/展開狀態記憶？
- 是否需要添加選單項目的搜索功能？
- 如何處理選單在深色模式下的顯示？