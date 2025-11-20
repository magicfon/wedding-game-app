## ADDED Requirements
### Requirement: 投票音效觸發
系統 SHALL 在用戶投票時觸發遊戲實況頁面的投票音效，提供即時的投票反饋。

#### Scenario: 投票音效觸發
- **WHEN** 用戶在照片牆頁面完成投票
- **THEN** 系統 SHALL 觸發投票音效事件
- **AND** 事件應包含投票類型和時間戳

#### Scenario: 投票音效事件傳播
- **WHEN** 投票音效事件被觸發
- **THEN** 系統 SHALL 將事件傳播到遊戲實況頁面
- **AND** 傳播應在 500ms 內完成

### Requirement: 投票音效狀態同步
系統 SHALL 確保投票音效狀態與遊戲實況頁面保持同步。

#### Scenario: 投票音效狀態同步
- **WHEN** 遊戲實況頁面更改音效設定
- **THEN** 系統 SHALL 將設定同步到照片牆頁面
- **AND** 同步應在 1 秒內完成