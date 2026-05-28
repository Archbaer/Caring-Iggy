-- V6__legacy_test_account.sql
-- Legacy EMPLOYEE-role account for testing BFF role normalization (EMPLOYEE → STAFF).

INSERT INTO employees (id, name, email, telephone, role_id, role, created_at, updated_at) VALUES
    ('ffffffff-6666-4666-8666-666666666666', 'Legacy Employee', 'legacy@caringiggy.test', '+1-555-9003', 2, 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, password_hash, role, profile_id, profile_type, created_at, updated_at) VALUES
    ('ffffffff-7777-4777-8777-777777777777', 'legacy@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'EMPLOYEE', 'ffffffff-6666-4666-8666-666666666666', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
