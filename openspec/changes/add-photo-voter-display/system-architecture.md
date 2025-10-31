# 系統架構圖

## 資料流程圖

```mermaid
sequenceDiagram
    participant Admin as 管理員
    participant Modal as 照片詳情彈窗
    participant API as API端點
    participant DB as 資料庫

    Admin->>Modal: 點擊照片查看詳情
    Modal->>Modal: 顯示照片基本資訊
    Modal->>API: GET /api/admin/photos/voters?photoId=123
    API->>API: 驗證管理員權限
    API->>DB: 查詢投票者資訊
    DB-->>API: 返回投票者資料
    API-->>Modal: 返回JSON回應
    Modal->>Modal: 渲染投票者列表
    Modal-->>Admin: 顯示投票者資訊
```

## 組件架構圖

```mermaid
graph TD
    A[照片管理頁面] --> B[照片網格]
    B --> C[照片卡片]
    C --> D[照片詳情彈窗]
    
    D --> E[照片顯示區]
    D --> F[照片資訊區]
    D --> G[祝福訊息區]
    D --> H[統計資訊區]
    D --> I[操作按鈕區]
    D --> J[投票者列表區]
    
    J --> K[投票者標題]
    J --> L[投票者網格]
    J --> M[空狀態]
    J --> N[載入狀態]
    
    L --> O[投票者卡片]
    O --> P[用戶頭像]
    O --> Q[用戶名稱]
    
    R[API端點] --> S[權限驗證]
    R --> T[資料庫查詢]
    R --> U[回應格式化]
    
    T --> V[votes表]
    T --> W[users表]
```

## 資料庫關係圖

```mermaid
erDiagram
    photos ||--o{ votes : "has"
    users ||--o{ votes : "casts"
    users ||--o{ photos : "uploads"
    
    photos {
        int id PK
        varchar uploader_line_id FK
        varchar image_url
        text blessing_message
        boolean is_public
        int vote_count
        timestamp created_at
    }
    
    users {
        varchar line_id PK
        varchar display_name
        text avatar_url
        int total_score
        timestamp join_time
        boolean is_active
    }
    
    votes {
        int id PK
        varchar voter_line_id FK
        int photo_id FK
        timestamp created_at
    }
```

## API 請求/回應結構

```mermaid
graph LR
    subgraph "請求"
        A[GET /api/admin/photos/voters]
        B[Query Parameters]
        C[photoId: 123]
        D[Authorization Header]
        E[Admin Token]
    end
    
    subgraph "回應"
        F[Success Response]
        G[voters array]
        H[totalVoters count]
        I[photoId]
        
        J[Error Response]
        K[error message]
        L[status code]
    end
    
    A --> F
    A --> J
    B --> C
    D --> E
    F --> G
    F --> H
    F --> I
    J --> K
    J --> L
```

## 前端狀態管理

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Success: API成功
    Loading --> Error: API失敗
    Success --> Loading: 重新載入
    Error --> Loading: 重試
    Error --> [*]: 關閉彈窗
    Success --> [*]: 關閉彈窗
    
    state Success {
        [*] --> HasVoters
        [*] --> NoVoters
    }
```

## 響應式設計斷點

```mermaid
graph LR
    A[手機 < 768px] --> B[2欄布局]
    C[平板 768-1023px] --> D[3欄布局]
    E[桌面 ≥ 1024px] --> F[4欄布局]
    
    B --> G[較大間距]
    D --> H[中等間距]
    F --> I[標準間距]
```

## 錯誤處理流程

```mermaid
flowchart TD
    A[API請求] --> B{權限檢查}
    B -->|失敗| C[401 未授權]
    B -->|成功| D{照片存在?}
    D -->|不存在| E[404 照片未找到]
    D -->|存在| F{資料庫查詢}
    F -->|成功| G[返回投票者資料]
    F -->|失敗| H[500 伺服器錯誤]
    
    C --> I[顯示錯誤訊息]
    E --> I
    H --> I
    G --> J[渲染投票者列表]
    
    I --> K[提供重試選項]
    J --> L[顯示投票者]
```

## 效能優化策略

```mermaid
graph TD
    A[資料庫查詢] --> B[使用索引]
    B --> C[只選擇必要欄位]
    C --> D[限制結果數量]
    
    E[前端渲染] --> F[懶載入圖片]
    F --> G[骨架屏載入]
    G --> H[虛擬化長列表]
    
    I[快取策略] --> J[API回應快取]
    J --> K[圖片快取]
    K --> L[瀏覽器快取]