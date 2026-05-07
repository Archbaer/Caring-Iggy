-- V5__test_accounts.sql
-- Test accounts with known passwords for E2E testing (password: password123)

INSERT INTO employees (id, name, email, telephone, role_id, role, created_at, updated_at) VALUES
    ('aaaaaaaa-1111-4111-8111-111111111111', 'Test Admin', 'testadmin@caringiggy.test', '+1-555-9001', 1, 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bbbbbbbb-2222-4222-8222-222222222222', 'Test Staff', 'teststaff@caringiggy.test', '+1-555-9002', 2, 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, password_hash, role, profile_id, profile_type, created_at, updated_at) VALUES
    ('cccccccc-3333-4333-8333-333333333333', 'testadmin@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'ADMIN', 'aaaaaaaa-1111-4111-8111-111111111111', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dddddddd-4444-4444-8444-444444444444', 'teststaff@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'STAFF', 'bbbbbbbb-2222-4222-8222-222222222222', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('eeeeeeee-5555-4555-8555-555555555555', 'testadopter@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'ADOPTER', 'cccccccc-1111-4111-8111-111111111111', 'ADOPTER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
