# 照片縮圖遷移指南

本指南說明如何執行照片縮圖功能的遷移、測試和回滾程序。

## 文件說明

- `add-thumbnail-support.sql` - 添加縮圖支援的資料庫結構變更
- `migrate-photos-to-thumbnails.sql` - 遷移現有照片到縮圖系統
- `rollback-thumbnail-support.sql` - 回滾縮圖功能到原始狀態
- `test-thumbnail-migration.sql` - 測試遷移和回滾程序

## 執行前準備

### 1. 備份資料庫
```sql
-- 創建完整備份
CREATE TABLE photos_backup_before_thumbnail AS SELECT * FROM photos;
```

### 2. 檢查當前狀態
```sql
-- 檢查 photos 表結構
\d photos

-- 檢查照片數量
SELECT COUNT(*) FROM photos;
```

## 遷移程序

### 步驟 1: 添加縮圖支援

```bash
# 使用 psql 執行
psql -d your_database -f database/add-thumbnail-support.sql

# 或使用 Supabase SQL 編輯器執行腳本內容
```

### 步驟 2: 測試遷移程序（可選但建議）

```bash
# 執行測試腳本
psql -d your_database -f database/test-thumbnail-migration.sql
```

### 步驟 3: 遷移現有照片

```bash
# 執行遷移腳本
psql -d your_database -f database/migrate-photos-to-thumbnails.sql
```

### 步驟 4: 驗證遷移結果

```sql
-- 檢查遷移狀態
SELECT * FROM check_thumbnail_migration_status();

-- 檢查具體照片的縮圖 URL
SELECT 
    id,
    image_url,
    thumbnail_small_url,
    thumbnail_medium_url,
    thumbnail_large_url,
    thumbnail_generated_at
FROM photos 
ORDER BY created_at DESC 
LIMIT 5;
```

## 回滾程序

如果需要回滾到原始狀態：

### 步驟 1: 執行回滾腳本

```bash
# 執行回滾腳本
psql -d your_database -f database/rollback-thumbnail-support.sql
```

### 步驟 2: 驗證回滾結果

```sql
-- 檢查回滾狀態
SELECT * FROM check_rollback_status();

-- 檢查 photos 表結構
\d photos

-- 檢查備份數據
SELECT COUNT(*) FROM photos_rollback_backup;
```

## 故障排除

### 常見問題

1. **遷移失敗**
   - 檢查資料庫連接權限
   - 確認沒有其他正在執行的遷移
   - 檢查磁碟空間是否足夠

2. **縮圖 URL 生成錯誤**
   - 檢查 `generate_vercel_image_url` 函數是否正確創建
   - 確認 `url_encode` 函數運行正常

3. **觸發器不工作**
   - 檢查觸發器是否正確創建
   - 確認觸發器函數存在且無錯誤

### 調試命令

```sql
-- 檢查遷移日誌
SELECT * FROM migration_log ORDER BY started_at DESC;

-- 檢查觸發器狀態
SELECT * FROM information_schema.triggers WHERE table_name = 'photos';

-- 檢查函數列表
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%thumbnail%';
```

## 效能監控

遷移完成後，建議監控以下指標：

1. **資料庫效能**
   ```sql
   -- 檢查查詢效能
   EXPLAIN ANALYZE SELECT * FROM photos WHERE thumbnail_generated_at IS NOT NULL;
   ```

2. **儲存空間使用**
   ```sql
   -- 檢查表大小
   SELECT pg_size_pretty(pg_total_relation_size('photos'));
   ```

3. **應用程式效能**
   - 監控照片牆載入時間
   - 檢查網路頻寬使用量
   - 觀察用戶體驗改善情況

## 自動化腳本

可以創建自動化腳本來簡化遷移過程：

```bash
#!/bin/bash
# migration.sh

DATABASE_URL="your_database_url"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 執行備份
echo "創建資料庫備份..."
pg_dump $DATABASE_URL > $BACKUP_DIR/pre_migration_backup.sql

# 執行遷移
echo "執行遷移..."
psql $DATABASE_URL -f database/add-thumbnail-support.sql
psql $DATABASE_URL -f database/migrate-photos-to-thumbnails.sql

# 驗證遷移
echo "驗證遷移結果..."
psql $DATABASE_URL -c "SELECT * FROM check_thumbnail_migration_status();"

echo "遷移完成！"
```

## 聯絡支援

如果在遷移過程中遇到問題，請：

1. 檢查錯誤日誌
2. 執行回滾程序恢復原始狀態
3. 聯繫技術支援團隊

---

**注意：** 在生產環境執行遷移前，請務必在測試環境中完整測試所有程序。