ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(20);

UPDATE employees
SET role = CASE role_id
    WHEN 1 THEN 'ADMIN'
    ELSE 'STAFF'
END
WHERE role IS NULL;

ALTER TABLE employees ALTER COLUMN role SET NOT NULL;

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    profile_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_accounts_role CHECK (role IN ('ADOPTER', 'STAFF', 'ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_email_lower ON accounts ((lower(email)));
CREATE INDEX IF NOT EXISTS idx_accounts_profile_id ON accounts (profile_id);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions (account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
