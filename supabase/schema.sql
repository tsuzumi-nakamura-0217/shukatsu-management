-- ============================================================
-- Supabase Schema for 就活マネージャー
-- ============================================================

-- 1. 企業テーブル
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  url TEXT DEFAULT '',
  location TEXT DEFAULT '',
  status TEXT DEFAULT '未応募',
  priority INTEGER DEFAULT 3,
  stages TEXT[] DEFAULT '{"未応募","ES提出","適性検査","1次面接","2次面接","最終面接","内定","不合格","辞退"}',
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. タスクテーブル
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_slug TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  title TEXT NOT NULL,
  category TEXT DEFAULT 'その他',
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline DATE,
  completed BOOLEAN DEFAULT FALSE,
  memo TEXT DEFAULT '',
  notion_page_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 面接記録テーブル
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_slug TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT DEFAULT '',
  result TEXT DEFAULT '結果待ち',
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ES文書テーブル
CREATE TABLE es_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 自己分析テーブル
CREATE TABLE self_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. テンプレートテーブル
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 設定テーブル (key-value store)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 初期設定データの挿入
INSERT INTO config (key, value) VALUES
  ('defaultStages', '["未応募","ES提出","適性検査","1次面接","2次面接","最終面接","内定","不合格","辞退"]'),
  ('industries', '["IT・通信","メーカー","金融","コンサル","商社","広告・マスコミ","不動産・建設","インフラ","小売・流通","サービス","公務員・団体","その他"]'),
  ('taskCategories', '["ES","面接","適性検査","説明会","OB訪問","その他"]'),
  ('notion', '{"apiKey":"","databaseId":"","enabled":false}');

-- ============================================================
-- Row Level Security (RLS) - 必要に応じて有効化
-- ============================================================
-- 現時点ではRLSを無効にしておく（個人利用のため）
-- 公開する場合は認証とRLSを設定してください

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- anon ユーザーに全操作を許可（個人利用）
CREATE POLICY "Allow all for anon" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON es_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON self_analysis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON config FOR ALL USING (true) WITH CHECK (true);
