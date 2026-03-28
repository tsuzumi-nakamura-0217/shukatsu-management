-- Add character_limit to es_documents table
ALTER TABLE es_documents ADD COLUMN IF NOT EXISTS character_limit INTEGER;

-- Update existing rows to have NULL (no limit) by default (which is already the case for new columns without DEFAULT)
COMMENT ON COLUMN es_documents.character_limit IS '目標文字数（字数指定）';
