-- Change tasks.deadline from DATE to TIMESTAMPTZ
-- Existing DATE values are migrated to 09:00 JST for better default UX.
BEGIN;

ALTER TABLE tasks
  ALTER COLUMN deadline TYPE TIMESTAMPTZ
  USING (
    CASE
      WHEN deadline IS NULL THEN NULL
      ELSE (deadline::timestamp + INTERVAL '9 hours') AT TIME ZONE 'Asia/Tokyo'
    END
  );

COMMIT;
