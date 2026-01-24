-- 彩球機資料庫表
-- 這些表與原本的照片摸彩功能完全分開

-- 彩球機狀態表
CREATE TABLE IF NOT EXISTS lottery_machine_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_lottery_active BOOLEAN DEFAULT false,
  is_drawing BOOLEAN DEFAULT false,
  current_draw_id INTEGER NULL,
  max_photos_for_lottery INTEGER DEFAULT 5,
  animation_mode TEXT DEFAULT 'lottery_machine',
  notify_winner_enabled BOOLEAN DEFAULT true,
  winners_per_draw INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 彩球機設定表（儲存軌道編輯器設定）
CREATE TABLE IF NOT EXISTS lottery_machine_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  track_config JSONB NOT NULL DEFAULT '{}',
  physics JSONB NOT NULL DEFAULT '{}',
  chamber_style JSONB NOT NULL DEFAULT '{}',
  platform_style JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設值（如果不存在）
INSERT INTO lottery_machine_state (id, is_lottery_active, is_drawing, current_draw_id, max_photos_for_lottery, animation_mode, notify_winner_enabled, winners_per_draw, updated_at)
SELECT 1, false, false, NULL, 5, 'lottery_machine', true, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM lottery_machine_state WHERE id = 1);

INSERT INTO lottery_machine_config (id, track_config, physics, chamber_style, platform_style, updated_at)
SELECT 1, 
  '{"chamberWidth": 480, "chamberHeight": 220, "ballDiameter": 42, "trackWidth": 32, "startPoint": {"x": 50, "y": 75}, "endPoint": {"x": 15, "y": 8}, "nodes": [{"id": 1, "x": 95, "y": 75}, {"id": 2, "x": 95, "y": 55}, {"id": 3, "x": 5, "y": 55}, {"id": 4, "x": 5, "y": 25}, {"id": 5, "x": 25, "y": 25}]}',
  '{"gravity": 0.35, "airForce": 0.8, "lateralAirForce": 0.2, "maxVelocity": 15}',
  '{"left": "50%", "bottom": "0px", "width": "480px", "chamberHeight": "220px"}',
  '{"left": "5%", "top": "0.5vh", "width": "280px", "height": "100px"}',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM lottery_machine_config WHERE id = 1);

-- 註釋說明
-- lottery_machine_state: 彩球機的運行狀態
--   - is_lottery_active: 彩球機是否啟用
--   - is_drawing: 是否正在抽獎中
--   - current_draw_id: 當前抽獎記錄的 ID（指向 lottery_history 表）
--   - max_photos_for_lottery: 每人最多計算的照片數量（加權設定）
--   - animation_mode: 動畫模式（lottery_machine）
--   - notify_winner_enabled: 是否啟用中獎通知
--   - winners_per_draw: 每次抽獎抽出幾位中獎者
--   - updated_at: 最後更新時間

-- lottery_machine_config: 彩球機的視覺和物理設定
--   - track_config: 軌道設定（腔體寬度、高度、彩球直徑、軌道路徑等）
--   - physics: 物理參數（重力、氣流力、側向氣流力、最大速度）
--   - chamber_style: 腔體樣式（位置、大小）
--   - platform_style: 平台樣式（位置、大小）
--   - updated_at: 最後更新時間

-- 注意：中獎歷史記錄將儲存在現有的 lottery_history 表中
-- 這樣可以與原本的照片摸彩功能共用歷史記錄
