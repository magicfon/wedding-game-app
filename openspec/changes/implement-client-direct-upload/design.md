## Context
當前的照片上傳系統通過 Vercel Serverless Function 作為代理，將檔案從客戶端傳送到 Supabase Storage。這種方法受到 Vercel 的 4.5MB（實際約 5MB）請求體大小限制，無法處理更大的檔案。為了支持高解析度照片上傳，需要實現客戶端直接上傳到 Supabase Storage 的解決方案。

## Goals / Non-Goals
- Goals: 
  - 移除檔案大小限制，支持任意大小的照片上傳
  - 對於大檔案（>6MB）使用 Resumable Upload 提高可靠性
  - 保持現有的用戶體驗（進度條、錯誤處理）
  - 確保安全性（認證、授權）
- Non-Goals:
  - 不修改現有的資料庫結構
  - 不改變照片顯示和投票功能
  - 不影響現有的管理員照片管理功能

## Decisions
- Decision: 使用 Supabase 客戶端 SDK 直接上傳到 Storage
  - Reason: Supabase 提供了完整的 JavaScript SDK，支援直接上傳和 Resumable Upload
  - Alternatives considered: 
    - 使用預簽名 URL：需要額外的 API 調用，複雜度較高
    - 使用第三方上傳服務：增加成本和依賴

- Decision: 對於大檔案（>6MB）使用 Resumable Upload
  - Reason: Supabase 建議對於超過 6MB 的檔案使用 Resumable Upload，提高網路不穩定時的上傳成功率
  - Alternatives considered:
    - 統一使用普通上傳：大檔案上傳失敗率較高
    - 自行實現分片上傳：開發複雜度高，重複造輪子

- Decision: 保持現有的 API 結構，但改為只處理元數據
  - Reason: 最小化前端變更，保持現有的錯誤處理和響應格式
  - Alternatives considered:
    - 創建全新的 API 端點：增加不必要的複雜度
    - 完全移除後端 API：無法處理業務邏輯和驗證

## Risks / Trade-offs
- Risk: 客戶端直接上傳可能增加安全風險
  - Mitigation: 使用 Supabase RLS (Row Level Security) 政策控制存取權限
- Risk: 大檔案上傳可能影響用戶體驗
  - Mitigation: 實現進度顯示和錯誤重試機制
- Trade-off: 增加了客戶端複雜度，但移除了伺服器端限制
- Trade-off: 需要處理更多客戶端錯誤情況，但提供了更好的用戶體驗

## Migration Plan
1. 實現客戶端直接上傳工具函數
2. 更新現有的上傳進度庫以支援直接上傳
3. 修改後端 API 為只處理元數據
4. 更新前端組件使用新的上傳方式
5. 測試各種大小的檔案上傳
6. 部署並監控上傳成功率

## Open Questions
- 如何最佳化大檔案上傳的用戶體驗？
- 是否需要實現上傳隊列機制？
- 如何處理網路中斷後的上傳恢復？