ALTER TABLE accounts ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20);

UPDATE accounts
SET profile_type = CASE role
    WHEN 'ADOPTER' THEN 'ADOPTER'
    ELSE 'EMPLOYEE'
END
WHERE profile_type IS NULL;

ALTER TABLE accounts ALTER COLUMN profile_type SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_accounts_profile_type'
    ) THEN
        ALTER TABLE accounts
            ADD CONSTRAINT chk_accounts_profile_type
            CHECK (profile_type IN ('ADOPTER', 'EMPLOYEE'));
    END IF;
END $$;
