# 新增 platform_surface_style 欄位指南

## 問題說明
軌道節點以及 chamber/winner platform 的參數資料無法儲存，原因是 `lottery_machine_config` 表缺少 `platform_surface_style` 欄位。

## 解決方案

### 方法 1：在 Supabase Dashboard 中執行（推薦）

1. **登入 Supabase Dashboard**
   - 前往 [supabase.com](https://supabase.com)
   - 登入並選擇您的專案

2. **打開 SQL Editor**
   - 在左側選單中點擊「SQL Editor」
   - 點擊「New query」

3. **執行遷移腳本**
   - 複製 `database/add-platform-surface-style-column.sql` 的全部內容
   - 貼上到 SQL Editor 中
   - 點擊「Run」執行

4. **驗證結果**
   ```sql
   -- 檢查欄位是否成功新增
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'lottery_machine_config'
   ORDER BY ordinal_position;
   ```

   應該可以看到 `platform_surface_style` 欄位。

### 方法 2：使用 Supabase CLI（如果您已安裝）

```bash
# 執行遷移腳本
supabase db execute --file database/add-platform-surface-style-column.sql
```

## 遷移腳本內容

```sql
-- 新增 platform_surface_style 欄位到 lottery_machine_config 表
-- 這個欄位用於儲存中獎者平台表面的樣式（特別是高度）

ALTER TABLE lottery_machine_config
ADD COLUMN IF NOT EXISTS platform_surface_style JSONB NOT NULL DEFAULT '{"height": "clamp(60px, 6vh, 100px)"}';

-- 更新現有記錄的預設值
UPDATE lottery_machine_config
SET platform_surface_style = '{"height": "clamp(60px, 6vh, 100px)"}'
WHERE platform_surface_style IS NULL OR platform_surface_style = '{}';
```

## 完成後

執行完遷移後，請重新載入頁面並測試：
1. 拖曳軌道節點（起點、終點、中間節點）
2. 拖曳 chamber（腔體）或 platform（中獎者平台）來調整位置或大小
3. 點擊「💾 儲存設定」按鈕

所有參數現在應該可以正常儲存了！
