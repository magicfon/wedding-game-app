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
經過多次嘗試，發現問題的根源是 AdminLayout 組件的側邊欄設計存在根本性問題。所有使用 AdminLayout 的頁面都表現出「左上右下」的問題，表明問題不在特定頁面，而在 AdminLayout 組件本身。

### 發現的解決方案
分析「照片上傳」頁面使用的 Layout 組件，發現它採用了覆蓋層（overlay）選單方式，這種方式：
1. **簡單有效**: 沒有複雜的定位問題
2. **跨設備一致**: 在所有設備上都能正常工作
3. **無顯示問題**: 不會出現「左上右下」問題

### 新的設計策略
1. **採用覆蓋層設計**: 類似「照片上傳」頁面的 Layout 組件
2. **移除側邊欄**: 不使用固定側邊欄設計
3. **全屏選單**: 選單以全屏覆蓋層方式顯示
4. **統一體驗**: 在所有設備上提供一致的選單體驗

### 推薦的佈局結構（基於 Layout 組件）
```jsx
// 主容器
<div className="min-h-screen bg-gray-100">
  {/* Header */}
  <header className="bg-white shadow-sm border-b">
    <div className="flex items-center justify-between">
      {/* 漢堡選單按鈕 */}
      <button onClick={() => setIsMenuOpen(true)}>
        <Menu className="w-6 h-6" />
      </button>
      
      {/* 頁面標題 */}
      <h1>{title || '管理員控制台'}</h1>
    </div>
  </header>

  {/* 選單覆蓋層 */}
  {isMenuOpen && (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl">
        {/* 選單內容 */}
      </div>
    </div>
  )}

  {/* 主內容 */}
  <main className="p-4 sm:p-6 lg:p-8">
    {children}
  </main>
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