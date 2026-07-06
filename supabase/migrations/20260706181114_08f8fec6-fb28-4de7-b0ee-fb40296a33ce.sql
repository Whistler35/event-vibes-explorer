
-- 1. Enum extension (must run outside a transaction block or committed alone; migration tool handles this)
ALTER TYPE blitz_audience ADD VALUE IF NOT EXISTS 'selected';
