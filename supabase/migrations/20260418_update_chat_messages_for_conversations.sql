-- Add conversation threads for chat history
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL DEFAULT '新しいチャット',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chat_conversations_user_last_message_idx
  ON chat_conversations(user_id, last_message_at DESC, created_at DESC);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conversations_owner_policy ON chat_conversations;
CREATE POLICY chat_conversations_owner_policy ON chat_conversations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE;

-- For users with legacy messages and no conversations, create one conversation.
INSERT INTO chat_conversations (user_id, title, created_at, updated_at, last_message_at)
SELECT
  m.user_id,
  '既存チャット',
  MIN(m.created_at),
  NOW(),
  MAX(m.created_at)
FROM chat_messages m
LEFT JOIN chat_conversations c ON c.user_id = m.user_id
WHERE m.user_id IS NOT NULL
  AND m.conversation_id IS NULL
  AND c.id IS NULL
GROUP BY m.user_id;

-- Backfill legacy messages into the earliest conversation of each user.
UPDATE chat_messages m
SET conversation_id = (
  SELECT c.id
  FROM chat_conversations c
  WHERE c.user_id = m.user_id
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE m.conversation_id IS NULL;

CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx
  ON chat_messages(conversation_id, created_at ASC);

DROP POLICY IF EXISTS chat_messages_owner_policy ON chat_messages;
CREATE POLICY chat_messages_owner_policy ON chat_messages
  FOR ALL USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM chat_conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = COALESCE(user_id, auth.uid())
    AND EXISTS (
      SELECT 1
      FROM chat_conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
    )
  );
