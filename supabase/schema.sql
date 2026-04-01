-- ============================================================
-- Supabase Schema for 就活マネージャー
-- ============================================================

-- 1. 企業テーブル
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  url TEXT DEFAULT '',
  mypage_url TEXT DEFAULT '',
  login_id TEXT DEFAULT '',
  password_encrypted TEXT DEFAULT '',
  location TEXT DEFAULT '',
  status TEXT DEFAULT '未応募',
  priority INTEGER DEFAULT 3,
  stages TEXT[] DEFAULT '{"未応募","ES提出","適性検査","1次面接","2次面接","最終面接","内定","不合格","辞退"}',
  memo TEXT DEFAULT '',
  expected_result_period TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. タスクテーブル
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_slug TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  title TEXT NOT NULL,
  category TEXT DEFAULT 'その他',
  execution_date DATE,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT '未着手',
  memo TEXT DEFAULT '',
  notion_page_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 面接記録テーブル
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_slug TEXT NOT NULL,
  type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT '',
  result TEXT DEFAULT '結果待ち',
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ES文書テーブル
CREATE TABLE es_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  character_limit INTEGER,
  character_limit_type TEXT,
  status TEXT DEFAULT '未提出',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN es_documents.character_limit IS '目標文字数（字数指定）';
COMMENT ON COLUMN es_documents.character_limit_type IS '字数指定の種別（程度、以下、未満など）';
COMMENT ON COLUMN es_documents.status IS 'ESの提出・合否ステータス（未提出、提出済、結果待ち、通過、落選など）';

-- 5. 自己分析テーブル
CREATE TABLE self_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. テンプレートテーブル
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 設定テーブル (key-value store)
CREATE TABLE config (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL
);

-- 8. Tipsテーブル
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'その他',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX companies_user_slug_key ON companies(user_id, slug);
CREATE UNIQUE INDEX config_user_key_key ON config(user_id, key);
CREATE UNIQUE INDEX config_global_key_key ON config(key) WHERE user_id IS NULL;

-- 初期設定データの挿入
INSERT INTO config (user_id, key, value) VALUES
  (NULL, 'defaultStages', '["未応募","ES提出","適性検査","1次面接","2次面接","最終面接","内定","不合格","辞退"]'),
  (NULL, 'industries', '["IT・通信","メーカー","金融","コンサル","商社","広告・マスコミ","不動産・建設","インフラ","小売・流通","サービス","公務員・団体","その他"]'),
  (NULL, 'taskCategories', '["ES","面接","適性検査","説明会","OB訪問","その他"]'),
  (NULL, 'notion', '{"apiKey":"","databaseId":"","enabled":false}');

-- ============================================================
-- Row Level Security (RLS) - 必要に応じて有効化
-- ============================================================
-- Googleログイン利用前提: ユーザー本人の行のみアクセス可能

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_owner_policy ON companies
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY tasks_owner_policy ON tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY interviews_owner_policy ON interviews
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY es_documents_owner_policy ON es_documents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY self_analysis_owner_policy ON self_analysis
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY templates_owner_policy ON templates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY tips_owner_policy ON tips
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

CREATE POLICY config_read_shared_policy ON config
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY config_write_owner_policy ON config
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
