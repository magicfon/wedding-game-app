## Context
照片牆功能目前直接載入原始高解析度圖片，導致初始載入時間過長，特別是在網路較慢的環境下。需要實施縮圖機制來提升性能，同時保持現有功能不變。

## Goals / Non-Goals
- Goals: 提升照片牆載入速度 50% 以上，實現漸進式載入效果，保持向後相容性
- Non-Goals: 不改變現有業務邏輯，不影響投票功能，不修改用戶界面風格

## Decisions
- Decision: 使用 Sharp 庫進行服務端圖片處理
  - Alternatives considered: 客戶端處理、第三方服務、Supabase Transform
  - Rationale: Sharp 性能最佳，完全控制處理流程，無外部依賴

- Decision: 縮圖尺寸設定為 150px 寬度
  - Alternatives considered: 100px、200px、響應式尺寸
  - Rationale: 150px 適合手機三列布局，平衡品質和大小

- Decision: 實現漸進式載入而非懶加載
  - Alternatives considered: 純懶加載、預載入、無限滾動優化
  - Rationale: 漸進式載入提供即時響應，用戶體驗最佳

## Risks / Trade-offs
- Risk: 圖片處理增加 API 響應時間
  - Mitigation: 異步處理，添加超時機制，錯誤不影響主要流程

- Risk: 存儲空間需求增加
  - Mitigation: 監控使用量，設置適當的清理策略，優化壓縮參數

- Trade-off: 複雜度增加 vs 性能提升
  - Mitigation: 模組化設計，清晰的文檔，可選的遷移策略

## Migration Plan
1. 執行資料庫更新腳本添加縮圖欄位
2. 部署更新的 API 和前端代碼
3. 可選執行遷移腳本為舊照片生成縮圖
4. 監控性能指標和錯誤率
5. 根據需要調整參數和優化

## Open Questions
- 縮圖壓縮品質是否需要根據圖片類型動態調整？
- 是否需要為不同設備尺寸提供多種縮圖規格？
- 遷移過程中如何處理大量舊照片的性能影響？