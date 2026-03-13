-- メール認証導入向け: ユーザー分離カラム + RLS ポリシー

ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE es_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE self_analysis ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE companies ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE interviews ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE es_documents ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE self_analysis ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE templates ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE config ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS companies_user_slug_key ON companies(user_id, slug);

ALTER TABLE config DROP CONSTRAINT IF EXISTS config_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS config_user_key_key ON config(user_id, key);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON companies;
DROP POLICY IF EXISTS "Allow all for anon" ON tasks;
DROP POLICY IF EXISTS "Allow all for anon" ON interviews;
DROP POLICY IF EXISTS "Allow all for anon" ON es_documents;
DROP POLICY IF EXISTS "Allow all for anon" ON self_analysis;
DROP POLICY IF EXISTS "Allow all for anon" ON templates;
DROP POLICY IF EXISTS "Allow all for anon" ON config;

DROP POLICY IF EXISTS companies_owner_policy ON companies;
DROP POLICY IF EXISTS tasks_owner_policy ON tasks;
DROP POLICY IF EXISTS interviews_owner_policy ON interviews;
DROP POLICY IF EXISTS es_documents_owner_policy ON es_documents;
DROP POLICY IF EXISTS self_analysis_owner_policy ON self_analysis;
DROP POLICY IF EXISTS templates_owner_policy ON templates;
DROP POLICY IF EXISTS config_owner_policy ON config;

CREATE POLICY companies_owner_policy ON companies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY tasks_owner_policy ON tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY interviews_owner_policy ON interviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY es_documents_owner_policy ON es_documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY self_analysis_owner_policy ON self_analysis
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY templates_owner_policy ON templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY config_owner_policy ON config
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
