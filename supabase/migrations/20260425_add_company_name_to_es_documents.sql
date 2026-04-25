-- ES文書に企業名スナップショットを保持（共有時の企業名表示を安定化）
ALTER TABLE es_documents
ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '';

-- 既存データを company_id ベースで補完
UPDATE es_documents es
SET company_name = c.name
FROM companies c
WHERE es.company_id = c.id
  AND COALESCE(es.company_name, '') = '';

-- 既存データを user_id + company_slug ベースで補完（company_id が欠損している場合の救済）
UPDATE es_documents es
SET company_name = c.name
FROM companies c
WHERE es.company_slug = c.slug
  AND es.user_id = c.user_id
  AND COALESCE(es.company_name, '') = '';
