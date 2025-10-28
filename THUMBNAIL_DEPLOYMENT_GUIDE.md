# 照片縮圖系統部署指南

本指南說明如何部署照片縮圖系統到生產環境，包括資料庫遷移、應用程式部署和效能監控設置。

## 📋 部署前檢查清單

### 環境準備
- [ ] Node.js 18+ 已安裝
- [ ] npm 或 yarn 已安裝
- [ ] Vercel CLI 已安裝（可選）
- [ ] 資料庫訪問權限
- [ ] 環境變數已設置

### 資料庫準備
- [ ] 資料庫備份已完成
- [ ] 測試資料庫可訪問性
- [ ] 遷移腳本已準備

### 應用程式準備
- [ ] 所有依賴已安裝
- [ ] 測試已通過
- [ ] 構建過程無錯誤
- [ ] 環境變數已配置

## 🚀 部署步驟

### 1. 資料庫遷移

#### 1.1 備份現有資料庫
```bash
# 使用 pg_dump 備份 PostgreSQL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用 Supabase CLI
supabase db dump --db-url=$DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2 執行縮圖支援遷移
```bash
# 執行主要遷移腳本
psql $DATABASE_URL -f database/add-thumbnail-support.sql

# 執行現有照片遷移
psql $DATABASE_URL -f database/migrate-photos-to-thumbnails.sql

# 執行影像效能日誌遷移
psql $DATABASE_URL -f database/add-image-performance-logging.sql
```

#### 1.3 驗證遷移結果
```sql
-- 檢查縮圖欄位是否已添加
\d photos

-- 檢查遷移狀態
SELECT * FROM check_thumbnail_migration_status();

-- 檢查影像效能日誌表
\d image_performance_logs
```

### 2. 應用程式部署

#### 2.1 安裝依賴
```bash
npm install
# 或
yarn install
```

#### 2.2 構建應用程式
```bash
npm run build
# 或
yarn build
```

#### 2.3 環境變數設置
創建 `.env.production` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### 2.4 部署到 Vercel
```bash
# 使用 Vercel CLI
vercel --prod

# 或通過 Vercel 儀表板上傳 .next 文件夾
```

### 3. 效能監控設置

#### 3.1 Vercel Analytics 配置
在 Vercel 儀表板中：
1. 進入項目設置
2. 啟用 Vercel Analytics
3. 配置自定義事件（可選）

#### 3.2 影像效能監控
系統會自動初始化影像效能監控，包括：
- 圖片載入時間追蹤
- 設備類型檢測
- 縮圖尺寸效能分析
- 錯誤率監控

## 🔧 配置選項

### 縮圖尺寸配置
在 `src/lib/image-performance-init.ts` 中調整：

```typescript
export const IMAGE_PERFORMANCE_CONFIG = {
  THUMBNAIL_SIZES: {
    small: { width: 200, quality: 75 },
    medium: { width: 400, quality: 80 },
    large: { width: 800, quality: 85 }
  },
  MONITORING: {
    SAMPLE_RATE: 0.1, // 10% 抽樣
    MAX_LOG_ENTRIES: 1000,
    CLEANUP_INTERVAL: 5 * 60 * 1000 // 5 分鐘
  }
}
```

### 監控配置
```typescript
const tracker = initializeImagePerformanceMonitoring({
  enableVercelAnalytics: true, // 生產環境啟用
  enableConsoleLogging: false, // 生產環境關閉
  enableCustomEndpoint: true,
  customEndpoint: '/api/analytics/image-performance',
  sampleRate: 0.1 // 10% 抽樣
})
```

## 📊 效能監控

### 查看效能數據
1. 訪問管理面板：`/admin/image-performance`
2. 查看詳細統計：
   - 按縮圖尺寸分組的載入時間
   - 按設備類型分組的成功率
   - 按網路條件分組的性能指標

### 效能優化建議
- 小尺寸圖片：目標載入時間 < 500ms
- 中等尺寸圖片：目標載入時間 < 1000ms
- 大尺寸圖片：目標載入時間 < 2000ms
- 整體成功率：目標 > 95%

## 🧪 測試

### 本地測試
```bash
# 運行單元測試
npm run test

# 運行效能測試
# 訪問 /debug/performance-test

# 運行網路測試
# 訪問 /debug/network-test
```

### 生產環境測試
1. 部署到測試環境
2. 驗證所有功能正常
3. 進行負載測試（可選）
4. 檢查效能指標

## 🔍 故障排除

### 常見問題

#### 資料庫遷移失敗
```bash
# 檢查資料庫連接
psql $DATABASE_URL -c "SELECT 1;"

# 檢查表結構
\d photos

# 查看遷移日誌
SELECT * FROM migration_log ORDER BY started_at DESC;
```

#### 圖片載入失敗
1. 檢查圖片 URL 是否正確
2. 驗證 Vercel Image Optimization 配置
3. 檢查瀏覽器控制台錯誤訊息

#### 效能監控不工作
1. 確認環境變數設置
2. 檢查網路請求是否成功
3. 驗證 API 端點是否可訪問

### 回滾程序
如果部署失敗，可以執行回滾：

```bash
# 回滾資料庫變更
psql $DATABASE_URL -f database/rollback-thumbnail-support.sql

# 回滾應用程式部署
vercel rollback [deployment-id]
```

## 📈 監控和維護

### 定期任務
建議設置以下定期任務：

1. **資料庫清理**
   ```sql
   -- 清理舊的影像效能日誌（保留 90 天）
   SELECT cleanup_old_image_performance_logs(90);
   ```

2. **效能報告**
   - 每週生成效能報告
   - 監控異常載入時間
   - 追蹤錯誤率趨勢

3. **儲存優化**
   - 定期清理不必要的檔案
   - 監控儲存空間使用
   - 優化資料庫查詢

### 警報設置
建議設置以下警報：

1. **高錯誤率警報**
   - 當圖片載入錯誤率 > 5% 時觸發

2. **慢載入時間警報**
   - 當平均載入時間超過預期值時觸發

3. **儲存空間警報**
   - 當可用空間 < 20% 時觸發

## 📚 相關文檔

- [照片縮圖技術設計](./photo-wall-technical-design.md)
- [照片縮圖實現指南](./photo-wall-implementation-guide.md)
- [照片縮圖項目總結](./photo-wall-project-summary.md)
- [資料庫遷移指南](./database/THUMBNAIL_MIGRATION_GUIDE.md)

## 🆘 支援

如果遇到部署問題，請：

1. 檢查本文檔的最新版本
2. 查看項目 GitHub Issues
3. 聯繫技術支援團隊
4. 查看相關的錯誤日誌

---

**注意：** 在生產環境中部署前，請務必在測試環境中完整驗證所有功能。