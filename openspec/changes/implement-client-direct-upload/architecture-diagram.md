# 客戶端直接上傳架構圖

## 當前架構（有檔案大小限制）

```mermaid
graph TD
    A[用戶選擇照片] --> B[前端驗證檔案大小]
    B --> C{檔案 > 5MB?}
    C -->|是| D[顯示錯誤訊息]
    C -->|否| E[上傳到 Vercel API]
    E --> F[Vercel Serverless Function]
    F --> G[上傳到 Supabase Storage]
    G --> H[儲存元數據到資料庫]
    H --> I[返回成功響應]
```

## 新架構（無檔案大小限制）

```mermaid
graph TD
    A[用戶選擇照片] --> B[前端檢查檔案大小]
    B --> C{檔案 >= 6MB?}
    C -->|否| D[直接上傳到 Supabase Storage]
    C -->|是| E[使用 Resumable Upload]
    D --> F[上傳完成]
    E --> F
    F --> G[發送元數據到 Vercel API]
    G --> H[Vercel Serverless Function]
    H --> I[驗證元數據]
    I --> J[儲存到資料庫]
    J --> K[返回成功響應]
```

## 詳細技術流程

```mermaid
sequenceDiagram
    participant U as 用戶
    participant C as 客戶端
    participant S as Supabase Storage
    participant A as Vercel API
    participant DB as 資料庫

    U->>C: 選擇照片檔案
    C->>C: 檢查檔案大小
    
    alt 小檔案 (<6MB)
        C->>S: 直接上傳檔案
        S-->>C: 返回檔案 URL
    else 大檔案 (>=6MB)
        C->>S: 開始 Resumable Upload
        loop 上傳分片
            C->>S: 上傳檔案分片
            S-->>C: 確認分片接收
        end
        S-->>C: 返回檔案 URL
    end
    
    C->>A: 發送元數據 (URL, 檔名, 大小等)
    A->>A: 驗證元數據
    A->>DB: 儲存照片記錄
    DB-->>A: 確認儲存
    A-->>C: 返回成功響應
    C-->>U: 顯示上傳成功
```

## 安全性考量

```mermaid
graph TD
    A[用戶認證] --> B[獲取 Supabase Token]
    B --> C[設定 RLS 政策]
    C --> D[限制上傳路徑]
    D --> E[驗證檔案類型]
    E --> F[元數據驗證]
    F --> G[資料庫記錄]
```

## 錯誤處理流程

```mermaid
graph TD
    A[開始上傳] --> B{網路錯誤?}
    B -->|是| C{檔案 >= 6MB?}
    C -->|是| D[嘗試恢復上傳]
    C -->|否| E[重新上傳]
    D --> F{恢復成功?}
    F -->|是| G[繼續上傳]
    F -->|否| E
    E --> A
    B -->|否| H{上傳成功?}
    H -->|是| I[發送元數據]
    H -->|否| J[顯示錯誤訊息]
    I --> K{元數據成功?}
    K -->|是| L[完成]
    K -->|否| M[清理已上傳檔案]
    M --> J
```

## 元數據 API 請求格式

```json
{
  "method": "POST",
  "endpoint": "/api/photo/upload",
  "body": {
    "fileName": "user_123456_1234567890_abc123.jpg",
    "fileUrl": "https://xxx.supabase.co/storage/v1/object/public/wedding-photos/user_123456_1234567890_abc123.jpg",
    "fileSize": 8564321,
    "fileType": "image/jpeg",
    "blessingMessage": "祝福新人百年好合",
    "isPublic": true,
    "uploaderLineId": "U1234567890"
  }
}
```

## 元數據 API 響應格式

```json
{
  "success": true,
  "message": "照片上傳成功",
  "data": {
    "id": 123,
    "user_id": "U1234567890",
    "image_url": "https://xxx.supabase.co/storage/v1/object/public/wedding-photos/user_123456_1234567890_abc123.jpg",
    "blessing_message": "祝福新人百年好合",
    "is_public": true,
    "vote_count": 0,
    "created_at": "2024-01-01T12:00:00Z"
  }
}