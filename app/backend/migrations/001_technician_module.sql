-- Migration 001: Technician Module Implementation
-- Description: Core tables for technician management, skills, zones, eligibility, and audit logs.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum for technician status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'technician_status') THEN
        CREATE TYPE technician_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
END;
$$;

-- 1. Core Table: technicians
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tech_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_e164 VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150),
    status technician_status NOT NULL DEFAULT 'ACTIVE',
    max_active_jobs INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_max_active_jobs_positive CHECK (max_active_jobs > 0),
    CONSTRAINT technicians_phone_e164_format_chk
        CHECK (phone_e164 ~ '^\+[1-9][0-9]{1,14}$')
);

DROP TRIGGER IF EXISTS update_technicians_updated_at ON technicians;
CREATE TRIGGER update_technicians_updated_at
BEFORE UPDATE ON technicians
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Skills
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS technician_skills (
    tech_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id),
    PRIMARY KEY (tech_id, skill_id)
);

-- 3. Zones
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS technician_zones (
    tech_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    PRIMARY KEY (tech_id, zone_id)
);

-- 4. Working Hours
CREATE TABLE IF NOT EXISTS technician_working_hours (
    id SERIAL PRIMARY KEY,
    tech_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday (Python weekday())
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
);

-- 5. Time Off
CREATE TABLE IF NOT EXISTS technician_time_off (
    id SERIAL PRIMARY KEY,
    tech_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,
    CONSTRAINT technician_time_off_window_chk CHECK (start_datetime < end_datetime)
);

-- Mock Jobs table (Required for job_rejections FK)
-- In a real system, this would be defined in a Jobs module migration
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    assigned_tech_id UUID REFERENCES technicians(id),
    skill_id INTEGER REFERENCES skills(id),
    zone_id INTEGER REFERENCES zones(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Job Rejections
CREATE TABLE IF NOT EXISTS job_rejections (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tech_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    PRIMARY KEY (job_id, tech_id)
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    payload JSONB
);

-- 8. Indexes as per requirements
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technician_skills_skill ON technician_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_technician_zones_zone ON technician_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_time_off_tech ON technician_time_off(tech_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_status ON jobs(assigned_tech_id, status);

-- Additional practical indexes
CREATE INDEX IF NOT EXISTS idx_time_off_tech_window ON technician_time_off(tech_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_job_rejections_tech ON job_rejections(tech_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Hardening for pre-existing deployments with older schema variants.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'technicians'
          AND column_name = 'status'
          AND udt_name <> 'technician_status'
    ) THEN
        ALTER TABLE technicians
        ALTER COLUMN status TYPE technician_status
        USING status::technician_status;
    END IF;
END;
$$;

ALTER TABLE IF EXISTS technicians
    DROP CONSTRAINT IF EXISTS check_status,
    DROP CONSTRAINT IF EXISTS check_max_active_jobs_positive,
    DROP CONSTRAINT IF EXISTS check_phone_e164_format;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_max_active_jobs_positive'
    ) THEN
        ALTER TABLE technicians
        ADD CONSTRAINT check_max_active_jobs_positive CHECK (max_active_jobs > 0);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'technicians_phone_e164_format_chk'
    ) THEN
        ALTER TABLE technicians
        ADD CONSTRAINT technicians_phone_e164_format_chk
        CHECK (phone_e164 ~ '^\+[1-9][0-9]{1,14}$');
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'technician_time_off_window_chk'
    ) THEN
        ALTER TABLE technician_time_off
        ADD CONSTRAINT technician_time_off_window_chk CHECK (start_datetime < end_datetime);
    END IF;
END;
$$;
