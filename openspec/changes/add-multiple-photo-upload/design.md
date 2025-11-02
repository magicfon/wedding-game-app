## Context
婚禮互動遊戲系統目前只支援單張照片上傳，用戶體驗有限。為了提升參與度，需要實現多張照片上傳功能，讓賓客能夠一次分享多個美好時刻。

## Goals / Non-Goals
- Goals: 
  - 支援一次上傳多張照片（預設最多3張）
  - 為每張照片的祝福語添加序號標記
  - 提供管理員控制最大上傳張數的功能
  - 保持現有照片牆和投票功能不受影響
- Non-Goals:
  - 不改變現有的照片儲存結構
  - 不影響現有的投票系統
  - 不改變照片牆的基本顯示邏輯

## Decisions
- Decision: 使用 upload_group_id 來標記同一次上傳的多張照片
  - Alternatives considered: 
    - 使用單獨的上傳記錄表（增加複雜度）
    - 使用時間戳分組（不夠精確）
  - Rationale: 簡單有效，易於實現和查詢

- Decision: 在資料庫中儲存帶序號的祝福語
  - Alternatives considered:
    - 前端動態添加序號（增加前端複雜度）
    - 使用模板系統（過度設計）
  - Rationale: 簡化前端邏輯，確保一致性

- Decision: 使用系統設定表儲存最大上傳張數
  - Alternatives considered:
    - 使用環境變數（需要重新部署）
    - 硬編碼在前端（不靈活）
  - Rationale: 提供管理員靈活控制，無需重新部署

## Risks / Trade-offs
- Risk: 多檔案同時上傳可能增加伺服器負載
  - Mitigation: 添加檔案大小和數量限制，實作進度顯示
- Risk: 資料庫查詢複雜度增加
  - Mitigation: 添加適當索引，優化查詢邏輯
- Trade-off: 增加資料庫欄位會增加儲存空間
  - Justification: 提升用戶體驗的價值大於儲存成本

## Migration Plan
1. 添加資料庫欄位（向後相容）
2. 更新上傳 API 支援多檔案
3. 修改前端介面
4. 部署管理員設定功能
5. 測試和驗證
6. 清理舊代碼（如需要）

## Open Questions
- 是否需要支援照片重新排序？
- 是否需要為同組照片提供特殊的顯示模式？
- 如何處理部分上傳失敗的情況？