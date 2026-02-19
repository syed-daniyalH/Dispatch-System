# Migrations Guide

## Files
- `001_technician_module.sql`: Legacy base schema.
- `002_admin_technician_profile.sql`: Admin technician profile schema alignment.
- `003_technician.sql`: Development-only seed data (legacy frontend technicians).

## How to run
Use the managed runner from `backend/`:

```bash
python scripts/migrate.py
```

Include seed data for local testing:

```bash
python scripts/migrate.py --with-seed
```

## Notes
- `003_technician.sql` should not be used for production data initialization.
- `scripts/migrate.py` stores applied versions in `schema_migrations`.
