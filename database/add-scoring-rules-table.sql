-- 創建計分規則表
CREATE TABLE IF NOT EXISTS scoring_rules (
    id SERIAL PRIMARY KEY,
    base_score INTEGER NOT NULL DEFAULT 50,
    random_bonus_min INTEGER NOT NULL DEFAULT 1,
    random_bonus_max INTEGER NOT NULL DEFAULT 50,
    participation_score INTEGER NOT NULL DEFAULT 50,
    timeout_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設計分規則
INSERT INTO scoring_rules (base_score, random_bonus_min, random_bonus_max, participation_score, timeout_score)
VALUES (50, 1, 50, 50, 0)
ON CONFLICT DO NOTHING;

-- 創建更新時間的觸發器
CREATE OR REPLACE FUNCTION update_scoring_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scoring_rules_updated_at
    BEFORE UPDATE ON scoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_scoring_rules_updated_at();

-- 查詢當前計分規則
SELECT 
    id,
    base_score as "基礎分數",
    random_bonus_min as "隨機加成最小值",
    random_bonus_max as "隨機加成最大值",
    participation_score as "參與獎",
    timeout_score as "超時分數",
    updated_at as "更新時間"
FROM scoring_rules
ORDER BY id DESC
LIMIT 1;
