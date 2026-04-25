-- ES文書に共有トークンを追加
ALTER TABLE es_documents ADD COLUMN share_token UUID DEFAULT NULL;
CREATE UNIQUE INDEX es_documents_share_token_key ON es_documents(share_token) WHERE share_token IS NOT NULL;

-- es_comments に投稿者名カラムを追加（共有者がコメント時に名前を付けられるように）
ALTER TABLE es_comments ADD COLUMN author_name TEXT DEFAULT NULL;

-- 共有トークンによるES文書の読み取りポリシー（匿名ユーザーもアクセス可能）
-- anon ロールでも share_token が一致すれば SELECT 可能
CREATE POLICY es_documents_share_read_policy ON es_documents
  FOR SELECT USING (share_token IS NOT NULL);

-- 共有トークンによるES文書の本文更新ポリシー（匿名ユーザーも更新可能）
CREATE POLICY es_documents_share_update_policy ON es_documents
  FOR UPDATE USING (share_token IS NOT NULL)
  WITH CHECK (share_token IS NOT NULL);

-- 共有されたES文書へのコメント操作ポリシー（匿名ユーザーも操作可能）
CREATE POLICY es_comments_shared_select_policy ON es_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM es_documents
      WHERE es_documents.id = es_comments.es_document_id
      AND es_documents.share_token IS NOT NULL
    )
  );

CREATE POLICY es_comments_shared_insert_policy ON es_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM es_documents
      WHERE es_documents.id = es_comments.es_document_id
      AND es_documents.share_token IS NOT NULL
    )
  );

CREATE POLICY es_comments_shared_update_policy ON es_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM es_documents
      WHERE es_documents.id = es_comments.es_document_id
      AND es_documents.share_token IS NOT NULL
    )
  );

CREATE POLICY es_comments_shared_delete_policy ON es_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM es_documents
      WHERE es_documents.id = es_comments.es_document_id
      AND es_documents.share_token IS NOT NULL
    )
  );
