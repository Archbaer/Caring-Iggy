-- Local and CI demo data. Production does not load classpath:db/dev.

-- Keep the legacy EMPLOYEE alias only where its compatibility fixture exists.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_accounts_role;
ALTER TABLE accounts
    ADD CONSTRAINT chk_accounts_role
    CHECK (role IN ('ADOPTER', 'STAFF', 'ADMIN', 'EMPLOYEE'));

INSERT INTO employees (id, name, email, telephone, role_id, role, created_at, updated_at) VALUES
    ('57dd114a-87aa-4dc7-b16d-686893245697', 'Admin User', 'admin@outlook.com', '+1-555-1001', 1, 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('3a733f09-23e5-4ea4-8320-c4c39e6e7e34', 'Staff Member', 'staff@gmail.com', '+1-555-1002', 2, 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aaaaaaaa-1111-4111-8111-111111111111', 'Test Admin', 'testadmin@caringiggy.test', '+1-555-9001', 1, 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bbbbbbbb-2222-4222-8222-222222222222', 'Test Staff', 'teststaff@caringiggy.test', '+1-555-9002', 2, 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ffffffff-6666-4666-8666-666666666666', 'Legacy Employee', 'legacy@caringiggy.test', '+1-555-9003', 2, 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, email, password_hash, role, profile_id, profile_type, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@outlook.com', '$2b$12$gSq475OjSWWBerD0IBF7oeKg7nDewQSy4xBeUyY11D32.fnhAem.O', 'ADMIN', '57dd114a-87aa-4dc7-b16d-686893245697', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'staff@gmail.com', '$2b$12$gSq475OjSWWBerD0IBF7oeKg7nDewQSy4xBeUyY11D32.fnhAem.O', 'STAFF', '3a733f09-23e5-4ea4-8320-c4c39e6e7e34', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cccccccc-3333-4333-8333-333333333333', 'testadmin@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'ADMIN', 'aaaaaaaa-1111-4111-8111-111111111111', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dddddddd-4444-4444-8444-444444444444', 'teststaff@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'STAFF', 'bbbbbbbb-2222-4222-8222-222222222222', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('eeeeeeee-5555-4555-8555-555555555555', 'testadopter@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'ADOPTER', 'cccccccc-1111-4111-8111-111111111111', 'ADOPTER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ffffffff-7777-4777-8777-777777777777', 'legacy@caringiggy.test', '$2b$12$/D0ZNF3LNdfkmZ/AOooY1ObnfwkS0wx0vTrredsOYbRj89UkpQKqm', 'EMPLOYEE', 'ffffffff-6666-4666-8666-666666666666', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
