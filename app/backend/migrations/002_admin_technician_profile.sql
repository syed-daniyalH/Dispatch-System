-- Migration 002: Admin Technician Profile module (backend-driven)
-- Aligns schema for technician profile APIs, schedule management, and time-off workflows.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- technicians
ALTER TABLE IF EXISTS technicians
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS manual_availability BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'full_name'
    ) THEN
        EXECUTE 'UPDATE technicians SET name = COALESCE(name, full_name) WHERE name IS NULL';
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'phone_e164'
    ) THEN
        EXECUTE 'UPDATE technicians SET phone = COALESCE(phone, phone_e164) WHERE phone IS NULL';
    END IF;
END$$;

ALTER TABLE IF EXISTS technicians
    ALTER COLUMN status TYPE TEXT USING lower(status::text),
    ALTER COLUMN status SET DEFAULT 'active';

UPDATE technicians
SET status = CASE
    WHEN status IN ('active', 'ACTIVE', 'inactive', 'INACTIVE') THEN
        CASE WHEN lower(status) = 'active' THEN 'active' ELSE 'deactivated' END
    ELSE 'deactivated'
END;

ALTER TABLE IF EXISTS technicians DROP CONSTRAINT IF EXISTS technicians_status_chk;
ALTER TABLE IF EXISTS technicians DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE IF EXISTS technicians
    ADD CONSTRAINT technicians_status_chk CHECK (status IN ('active', 'deactivated'));

CREATE UNIQUE INDEX IF NOT EXISTS technicians_email_uq_idx ON technicians(email);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'full_name'
    ) THEN
        ALTER TABLE technicians DROP COLUMN full_name;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'phone_e164'
    ) THEN
        ALTER TABLE technicians DROP COLUMN phone_e164;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'tech_code'
    ) THEN
        ALTER TABLE technicians DROP COLUMN tech_code;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'max_active_jobs'
    ) THEN
        ALTER TABLE technicians DROP COLUMN max_active_jobs;
    END IF;
END$$;

DROP TRIGGER IF EXISTS update_technicians_updated_at ON technicians;
CREATE TRIGGER update_technicians_updated_at
BEFORE UPDATE ON technicians
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Rebuild mapping/domain tables with UUID PKs
ALTER TABLE IF EXISTS jobs DROP CONSTRAINT IF EXISTS jobs_skill_id_fkey;
ALTER TABLE IF EXISTS jobs DROP CONSTRAINT IF EXISTS jobs_zone_id_fkey;

DROP TABLE IF EXISTS technician_skills;
DROP TABLE IF EXISTS technician_zones;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS zones;

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS technician_zones (
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    UNIQUE (technician_id, zone_id)
);

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS technician_skills (
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE (technician_id, skill_id)
);

-- Working hours (overnight not supported)
DROP TABLE IF EXISTS technician_working_hours;

CREATE TABLE IF NOT EXISTS technician_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT working_hours_time_range_chk CHECK (end_time > start_time),
    UNIQUE (technician_id, day_of_week)
);

-- Time off (technician-created, no approval)
DROP TABLE IF EXISTS technician_time_off;

CREATE TABLE IF NOT EXISTS technician_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ NULL,
    CONSTRAINT time_off_date_range_chk CHECK (start_date <= end_date),
    CONSTRAINT time_off_entry_type_chk CHECK (
        entry_type IN ('full_day', 'multi_day', 'half_day_morning', 'half_day_afternoon', 'break')
    )
);

-- Audit logs
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'technician')),
    actor_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep assignment engine compatibility with jobs table

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'jobs'
          AND column_name = 'skill_id'
          AND data_type <> 'uuid'
    ) THEN
        ALTER TABLE jobs DROP COLUMN skill_id;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'jobs'
          AND column_name = 'zone_id'
          AND data_type <> 'uuid'
    ) THEN
        ALTER TABLE jobs DROP COLUMN zone_id;
    END IF;
END$$;

ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id);
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

CREATE INDEX IF NOT EXISTS idx_technician_zones_technician_id ON technician_zones(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_zones_zone_id ON technician_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_technician_skills_technician_id ON technician_skills(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_skills_skill_id ON technician_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_technician_day ON technician_working_hours(technician_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_time_off_technician_window ON technician_time_off(technician_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_role, actor_id);

COMMIT;
