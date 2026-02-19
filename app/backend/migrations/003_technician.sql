-- Migration 003 (DEV SEED): Seed technicians from legacy frontend MOCK_TECHS data.
-- Safe to run multiple times.
-- Recommended usage: run only in local/dev environments.

BEGIN;

-- Zones from previous frontend.
INSERT INTO zones (name)
VALUES
    ('Quebec'),
    ('Levis'),
    ('Donnacona'),
    ('St-Raymond')
ON CONFLICT (name) DO NOTHING;

-- Skills from previous frontend.
INSERT INTO skills (name)
VALUES
    ('PPF'),
    ('Window Tint'),
    ('Windshield replacement'),
    ('Windshield repair'),
    ('Remote starters'),
    ('Vehicle tracking systems'),
    ('Engine immobilizers')
ON CONFLICT (name) DO NOTHING;

-- Technicians from previous frontend.
INSERT INTO technicians (name, email, phone, status, manual_availability)
VALUES
    ('Jolianne', 'jolianne@sm2dispatch.com', '418-896-1296', 'active', TRUE),
    ('Victor', 'victor@sm2dispatch.com', NULL, 'active', TRUE),
    ('Maxime', 'maxime@sm2dispatch.com', NULL, 'active', TRUE),
    ('Dany', 'dany@sm2dispatch.com', '418-806-3649', 'active', TRUE)
ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    manual_availability = EXCLUDED.manual_availability,
    updated_at = NOW();

-- Zone assignments.
WITH desired_assignments(tech_email, zone_name) AS (
    VALUES
        ('jolianne@sm2dispatch.com', 'Quebec'),
        ('jolianne@sm2dispatch.com', 'Levis'),
        ('jolianne@sm2dispatch.com', 'Donnacona'),
        ('jolianne@sm2dispatch.com', 'St-Raymond'),
        ('victor@sm2dispatch.com', 'Donnacona'),
        ('victor@sm2dispatch.com', 'St-Raymond'),
        ('victor@sm2dispatch.com', 'Quebec'),
        ('victor@sm2dispatch.com', 'Levis'),
        ('maxime@sm2dispatch.com', 'Donnacona'),
        ('maxime@sm2dispatch.com', 'St-Raymond'),
        ('maxime@sm2dispatch.com', 'Quebec'),
        ('maxime@sm2dispatch.com', 'Levis'),
        ('dany@sm2dispatch.com', 'Quebec')
)
INSERT INTO technician_zones (technician_id, zone_id)
SELECT t.id, z.id
FROM desired_assignments da
JOIN technicians t ON t.email = da.tech_email
JOIN zones z ON z.name = da.zone_name
ON CONFLICT (technician_id, zone_id) DO NOTHING;

-- Skill assignments.
WITH desired_assignments(tech_email, skill_name) AS (
    VALUES
        ('jolianne@sm2dispatch.com', 'PPF'),
        ('victor@sm2dispatch.com', 'PPF'),
        ('victor@sm2dispatch.com', 'Window Tint'),
        ('maxime@sm2dispatch.com', 'PPF'),
        ('maxime@sm2dispatch.com', 'Window Tint'),
        ('dany@sm2dispatch.com', 'Windshield replacement'),
        ('dany@sm2dispatch.com', 'Windshield repair'),
        ('dany@sm2dispatch.com', 'Remote starters'),
        ('dany@sm2dispatch.com', 'Vehicle tracking systems'),
        ('dany@sm2dispatch.com', 'Engine immobilizers')
)
INSERT INTO technician_skills (technician_id, skill_id)
SELECT t.id, s.id
FROM desired_assignments da
JOIN technicians t ON t.email = da.tech_email
JOIN skills s ON s.name = da.skill_name
ON CONFLICT (technician_id, skill_id) DO NOTHING;

-- Weekly schedule from previous frontend:
-- Mon-Thu 08:00-17:00, Fri 08:00-15:00, Sat/Sun disabled.
-- day_of_week mapping in this app: 0=Sun, 1=Mon, ..., 6=Sat.
WITH seeded_techs AS (
    SELECT id
    FROM technicians
    WHERE email IN (
        'jolianne@sm2dispatch.com',
        'victor@sm2dispatch.com',
        'maxime@sm2dispatch.com',
        'dany@sm2dispatch.com'
    )
),
schedule(day_of_week, is_enabled, start_time, end_time) AS (
    VALUES
        (0, FALSE, '09:00', '17:00'),
        (1, TRUE,  '08:00', '17:00'),
        (2, TRUE,  '08:00', '17:00'),
        (3, TRUE,  '08:00', '17:00'),
        (4, TRUE,  '08:00', '17:00'),
        (5, TRUE,  '08:00', '15:00'),
        (6, FALSE, '09:00', '17:00')
)
INSERT INTO technician_working_hours (
    technician_id,
    day_of_week,
    is_enabled,
    start_time,
    end_time
)
SELECT
    t.id,
    s.day_of_week,
    s.is_enabled,
    s.start_time::time,
    s.end_time::time
FROM seeded_techs t
CROSS JOIN schedule s
ON CONFLICT (technician_id, day_of_week) DO UPDATE
SET
    is_enabled = EXCLUDED.is_enabled,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

COMMIT;

