-- Add status column to es_documents
ALTER TABLE es_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '未提出';

COMMENT ON COLUMN es_documents.status IS 'ESの提出・合否ステータス（未提出、提出済、結果待ち、通過、落選など）';
