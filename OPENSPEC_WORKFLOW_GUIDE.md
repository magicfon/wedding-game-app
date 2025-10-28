# OpenSpec 工作流程指南

## 概述

OpenSpec 是一個規格驅動的開發框架，幫助團隊在實施變更之前進行充分的規劃和設計。它將「規格」（當前已實現的功能）與「變更提案」（計劃實施的功能）分開管理。

## 核心概念

### 規格 (Specs)
- **定義**: 描述系統當前已實現的功能和行為
- **位置**: `openspec/specs/[capability]/spec.md`
- **內容**: 需求 (Requirements) 和場景 (Scenarios)
- **狀態**: 代表「已部署」的系統狀態

### 變更提案 (Changes)
- **定義**: 描述計劃實施的功能變更
- **位置**: `openspec/changes/[change-id]/`
- **內容**: proposal.md, tasks.md, design.md (可選), spec deltas
- **狀態**: 代表「待實施」的計劃

## 三階段工作流程

### 階段 1: 創建變更提案

#### 何時需要創建提案
- ✅ 添加新功能或能力
- ✅ 進行破壞性變更 (API、架構)
- ✅ 改變架構或設計模式
- ✅ 性能最佳化 (改變行為)
- ✅ 更新安全模式

#### 何時不需要提案
- ❌ 錯誤修復 (恢復預期行為)
- ❌ 拼寫、格式、註解修正
- ❌ 非破壞性依賴更新
- ❌ 配置變更
- ❌ 現有行為的測試

#### 創建步驟

1. **探索現有狀態**
```bash
openspec list                  # 查看活躍變更
openspec list --specs          # 查看現有規格
openspec show [spec-name]      # 查看特定規格詳情
```

2. **選擇唯一的變更 ID**
- 格式: kebab-case, 動詞開頭
- 前綴: `add-`, `update-`, `remove-`, `refactor-`
- 範例: `add-photo-thumbnail-support`, `update-auth-flow`

3. **建立目錄結構**
```bash
mkdir -p openspec/changes/[change-id]/specs/[capability]/
```

4. **撰寫提案文件**

**proposal.md** (為什麼和什麼)
```markdown
## Why
[1-2 句話描述問題或機會]

## What Changes
- [變更列表]
- [標記破壞性變更為 **BREAKING**]

## Impact
- Affected specs: [受影響的能力列表]
- Affected code: [關鍵文件/系統]
```

**tasks.md** (如何實施)
```markdown
## 1. 實施階段
- [ ] 1.1 創建資料庫架構
- [ ] 1.2 實施 API 端點
- [ ] 1.3 添加前端組件
- [ ] 1.4 編寫測試
```

**design.md** (技術決策，僅在需要時)
- 跨領域變更或多服務模組
- 新外部依賴或重大資料模型變更
- 安全、性能或遷移複雜性
- 需要技術決策來消除模糊性

**規格差異** (specs/[capability]/spec.md)
```markdown
## ADDED Requirements
### Requirement: 新功能
系統 SHALL 提供...

#### Scenario: 成功案例
- **WHEN** 用戶執行操作
- **THEN** 預期結果

## MODIFIED Requirements
### Requirement: 現有功能
[完整的修改後需求]

## REMOVED Requirements
### Requirement: 舊功能
**Reason**: [移除原因]
**Migration**: [處理方式]
```

5. **驗證提案**
```bash
openspec validate [change-id] --strict
```

### 階段 2: 實施變更

#### 實施前檢查清單
- [ ] 閱讀 proposal.md - 了解要構建什麼
- [ ] 閱讀 design.md (如果存在) - 審查技術決策
- [ ] 閱讀 tasks.md - 獲取實施檢查清單
- [ ] 確保提案已獲批准 (不要在批准前開始實施)

#### 實施步驟
1. **按順序完成任務**: 遵循 tasks.md 中的順序
2. **逐一完成**: 一次專注於一個任務
3. **確認完成**: 確保 tasks.md 中的每個項目都已完成
4. **更新狀態**: 完成所有工作後，將每個任務標記為 `- [x]`

#### 實施期間的最佳實踐
- 保持變更範圍小於 100 行新代碼
- 優先使用單文件實施
- 選擇簡單、經過驗證的模式
- 避免沒有明確理由的複雜性

### 階段 3: 歸檔變更

#### 部署後步驟
1. **創建獨立 PR** 將變更移至歸檔
2. **移動目錄**: `changes/[name]/` → `changes/archive/YYYY-MM-DD-[name]/`
3. **更新規格**: 如果能力發生變更，更新 `specs/`
4. **驗證歸檔**: 確保歸檔的變更通過檢查

#### 歸檔指令
```bash
# 僅工具變更 (不更新規格)
openspec archive [change] --skip-specs --yes

# 完整歸檔 (包含規格更新)
openspec archive [change]

# 驗證歸檔
openspec validate --strict
```

## 重要規則和格式

### 場景格式 (關鍵)
```markdown
#### Scenario: 名稱
- **WHEN** 條件
- **THEN** 結果
```

**正確** (使用 #### 標題):
```markdown
#### Scenario: 用戶登入成功
- **WHEN** 提供有效憑證
- **THEN** 返回 JWT token
```

**錯誤** (不要使用項目符號或粗體):
```markdown
- **Scenario: 用戶登入**  ❌
**Scenario**: 用戶登入     ❌
### Scenario: 用戶登入      ❌
```

### 需求措辭
- 使用 SHALL/MUST 表示規範性需求
- 避免使用 should/may (除非故意非規範性)

### Delta 操作
- `## ADDED Requirements` - 新能力
- `## MODIFIED Requirements` - 改變行為
- `## REMOVED Requirements` - 棄用功能
- `## RENAMED Requirements` - 名稱變更

### ADDED vs MODIFIED 的選擇
- **ADDED**: 引入可以獨立作為需求的新能力或子能力
- **MODIFIED**: 改變現有需求的行為、範圍或驗收標準

## 實用指令

### 基本指令
```bash
openspec list                  # 列出活躍變更
openspec list --specs          # 列出規格
openspec show [item]           # 顯示變更或規格
openspec diff [change]         # 顯示規格差異
openspec validate [item]       # 驗證變更或規格
openspec archive [change]     # 歸檔變更
```

### 進階指令
```bash
openspec show [change] --json --deltas-only  # JSON 格式顯示差異
openspec validate [change] --strict          # 嚴格模式驗證
openspec archive [change] --yes              # 非互動式歸檔
```

### 搜尋指令
```bash
# 全文搜尋 (使用 ripgrep)
rg -n "Requirement:|Scenario:" openspec/specs
rg -n "^#|Requirement:" openspec/changes
```

## 最佳實踐

### 簡單性優先
- 預設小於 100 行新代碼
- 單文件實施直到證明不足
- 避免沒有明確理由的框架
- 選擇無聊、經過驗證的模式

### 複雜性觸發器
只有在以下情況才添加複雜性：
- 性能數據顯示當前解決方案太慢
- 具體的規模需求 (>1000 用戶, >100MB 數據)
- 多個經過驗證的用例需要抽象

### 清晰引用
- 使用 `file.ts:42` 格式引用代碼位置
- 引用規格為 `specs/auth/spec.md`
- 鏈接相關變更和 PR

### 能力命名
- 使用動詞-名詞: `user-auth`, `payment-capture`
- 每個能力單一目的
- 10 分鐘理解規則
- 如果描述需要 "AND" 則拆分

## 故障排除

### 常見錯誤

**"Change must have at least one delta"**
- 檢查 `changes/[name]/specs/` 存在 .md 文件
- 驗證文件有操作前綴 (## ADDED Requirements)

**"Requirement must have at least one scenario"**
- 檢查場景使用 `#### Scenario:` 格式 (4 個 #)
- 不要使用項目符號或粗體標題

**無聲場景解析失敗**
- 需要確切格式: `#### Scenario: 名稱`
- 使用以下指令除錯: `openspec show [change] --json --deltas-only`

### 驗證提示
```bash
# 總是使用嚴格模式進行全面檢查
openspec validate [change] --strict

# 除錯 delta 解析
openspec show [change] --json | jq '.deltas'

# 檢查特定需求
openspec show [spec] --json -r 1
```

## 範例工作流程

### 完整的快樂路徑腳本
```bash
# 1) 探索當前狀態
openspec spec list --long
openspec list

# 2) 選擇變更 id 並建立腳手架
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Why\n...\n\n## What Changes\n- ...\n\n## Impact\n- ...\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Implementation\n- [ ] 1.1 ...\n" > openspec/changes/$CHANGE/tasks.md

# 3) 添加差異 (範例)
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Two-Factor Authentication
Users MUST provide a second factor during login.

#### Scenario: OTP required
- **WHEN** valid credentials are provided
- **THEN** an OTP challenge is required
EOF

# 4) 驗證
openspec validate $CHANGE --strict
```

## 總結

OpenSpec 提供了一個結構化的方法來管理軟體變更，確保：

1. **規劃優先**: 在編寫代碼之前充分思考
2. **清晰性**: 明確的需求和場景定義
3. **可追蹤性**: 從提案到實施到歸檔的完整生命週期
4. **品質保證**: 驗證步驟確保規格的正確性

通過遵循這個工作流程，團隊可以更有效地管理複雜的軟體項目，減少錯誤，提高交付品質。