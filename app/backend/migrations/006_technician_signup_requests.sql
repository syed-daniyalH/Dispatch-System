CREATE TABLE IF NOT EXISTS technician_signup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_technician_id UUID REFERENCES technicians(id),
    rejection_reason TEXT,
    CONSTRAINT technician_signup_requests_status_chk CHECK (status IN ('pending', 'approved', 'rejected'))
);

DROP TRIGGER IF EXISTS update_technician_signup_requests_updated_at ON technician_signup_requests;
CREATE TRIGGER update_technician_signup_requests_updated_at
BEFORE UPDATE ON technician_signup_requests
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_technician_signup_requests_status
    ON technician_signup_requests (status);

CREATE INDEX IF NOT EXISTS idx_technician_signup_requests_requested_at
    ON technician_signup_requests (requested_at DESC);
