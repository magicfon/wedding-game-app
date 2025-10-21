## ADDED Requirements
### Requirement: 即時聊天功能
系統 SHALL 提供即時聊天功能，讓已認證用戶能夠在婚禮活動期間發送和接收訊息。

#### Scenario: 用戶發送訊息
- **WHEN** 已登入用戶在聊天介面輸入訊息並點擊發送
- **THEN** 訊息 SHALL 立即顯示在所有用戶的聊天介面中
- **AND** 訊息 SHALL 包含用戶名稱、時間戳和訊息內容

#### Scenario: 用戶接收訊息
- **WHEN** 其他用戶發送新訊息
- **THEN** 新訊息 SHALL 自動出現在用戶的聊天介面中
- **AND** 系統 SHALL 顯示新訊息提示

#### Scenario: 訊息歷史記錄
- **WHEN** 用戶首次進入聊天介面
- **THEN** 系統 SHALL 顯示最近的 50 條訊息
- **AND** 訊息 SHALL 按時間順序排列

### Requirement: 聊天室管理
系統 SHALL 提供基本的聊天室管理功能，讓管理員能夠監控和管理聊天內容。

#### Scenario: 管理員查看聊天統計
- **WHEN** 管理員訪問聊天管理介面
- **THEN** 系統 SHALL 顯示活躍用戶數、訊息總數和活躍時間

#### Scenario: 管理員刪除不當訊息
- **WHEN** 管理員選擇刪除特定訊息
- **THEN** 該訊息 SHALL 從所有用戶的聊天介面中移除
- **AND** 系統 SHALL 記錄刪除操作

### Requirement: 聊天規則限制
系統 SHALL 實施基本的聊天規則，確保交流環境友好和安全。

#### Scenario: 訊息長度限制
- **WHEN** 用戶嘗試發送超過 200 字元的訊息
- **THEN** 系統 SHALL 顯示錯誤提示
- **AND** 該訊息 SHALL 不會被發送

#### Scenario: 發送頻率限制
- **WHEN** 用戶在 10 秒內嘗試發送超過 3 條訊息
- **THEN** 系統 SHALL 暫時限制該用戶的發送權限
- **AND** 顯示「請稍後再發送」的提示