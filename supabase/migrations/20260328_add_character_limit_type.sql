-- Add character_limit_type to es_documents table
ALTER TABLE es_documents ADD COLUMN IF NOT EXISTS character_limit_type TEXT;

COMMENT ON COLUMN es_documents.character_limit_type IS '字数指定の種別（程度、以下、未満など）';
