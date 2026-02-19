-- Migration 005: Normalize legacy mojibake zone names from old seed data.

BEGIN;

-- Normalize direct names in-place (common legacy values).
UPDATE zones
SET name = 'Quebec'
WHERE name IN ('QuÃ©bec', 'Québec');

UPDATE zones
SET name = 'Levis'
WHERE name IN ('LÃ©vis', 'Lévis');

COMMIT;
