-- ES文書コメントテーブル
CREATE TABLE es_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  es_document_id UUID REFERENCES es_documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  highlighted_text TEXT NOT NULL DEFAULT '',
  position_from INTEGER NOT NULL DEFAULT 0,
  position_to INTEGER NOT NULL DEFAULT 0,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX es_comments_es_document_id_idx ON es_comments(es_document_id);
CREATE INDEX es_comments_user_id_idx ON es_comments(user_id);

-- RLS
ALTER TABLE es_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY es_comments_owner_policy ON es_comments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
