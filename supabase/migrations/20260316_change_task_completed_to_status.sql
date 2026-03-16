-- Migration to change task completed (boolean) to status (text)
BEGIN;

-- 1. Add new status column
ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT '未着手';

-- 2. Migrate data from completed to status
-- If completed is TRUE, status becomes '完了'
-- If completed is FALSE, status becomes '未着手'
UPDATE tasks 
SET status = CASE 
    WHEN completed = TRUE THEN '完了' 
    ELSE '未着手' 
END;

-- 3. Remove old completed column
ALTER TABLE tasks DROP COLUMN completed;

-- 4. Update row_to_task mapping (this is done in code, but good to know for schema.sql)

COMMIT;
