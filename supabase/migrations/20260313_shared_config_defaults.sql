-- config初期値を全ユーザー共通で参照できるようにする

-- 既存のグローバル重複行を整理（user_id IS NULL で key 重複がある場合）
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY key ORDER BY ctid) AS rn
  FROM config
  WHERE user_id IS NULL
)
DELETE FROM config
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

-- グローバル設定（user_id IS NULL）の key 一意制約
CREATE UNIQUE INDEX IF NOT EXISTS config_global_key_key
  ON config(key)
  WHERE user_id IS NULL;

-- config のRLSを「読取: グローバル + 自分」「書込: 自分のみ」に変更
DROP POLICY IF EXISTS config_owner_policy ON config;
DROP POLICY IF EXISTS config_read_shared_policy ON config;
DROP POLICY IF EXISTS config_write_owner_policy ON config;

CREATE POLICY config_read_shared_policy ON config
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY config_write_owner_policy ON config
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 初期値のグローバル行を補完
INSERT INTO config (user_id, key, value)
SELECT NULL, 'defaultStages', '["未応募","ES提出","適性検査","1次面接","2次面接","最終面接","内定","不合格","辞退"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM config WHERE user_id IS NULL AND key = 'defaultStages'
);

INSERT INTO config (user_id, key, value)
SELECT NULL, 'industries', '["IT・通信","メーカー","金融","コンサル","商社","広告・マスコミ","不動産・建設","インフラ","小売・流通","サービス","公務員・団体","その他"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM config WHERE user_id IS NULL AND key = 'industries'
);

INSERT INTO config (user_id, key, value)
SELECT NULL, 'taskCategories', '["ES","面接","適性検査","説明会","OB訪問","その他"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM config WHERE user_id IS NULL AND key = 'taskCategories'
);

INSERT INTO config (user_id, key, value)
SELECT NULL, 'notion', '{"apiKey":"","databaseId":"","enabled":false}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM config WHERE user_id IS NULL AND key = 'notion'
);
