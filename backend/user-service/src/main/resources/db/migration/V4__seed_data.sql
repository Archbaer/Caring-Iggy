-- V4__seed_data.sql
-- Test accounts for Caring Iggy

INSERT INTO employees (id, name, email, telephone, role_id, role, created_at, updated_at) VALUES
    ('57dd114a-87aa-4dc7-b16d-686893245697', 'Admin User', 'admin@outlook.com', '+1-555-1001', 1, 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('3a733f09-23e5-4ea4-8320-c4c39e6e7e34', 'Staff Member', 'staff@gmail.com', '+1-555-1002', 2, 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO accounts (id, email, password_hash, role, profile_id, profile_type, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@outlook.com', '$2b$12$gSq475OjSWWBerD0IBF7oeKg7nDewQSy4xBeUyY11D32.fnhAem.O', 'ADMIN', '57dd114a-87aa-4dc7-b16d-686893245697', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'staff@gmail.com', '$2b$12$gSq475OjSWWBerD0IBF7oeKg7nDewQSy4xBeUyY11D32.fnhAem.O', 'STAFF', '3a733f09-23e5-4ea4-8320-c4c39e6e7e34', 'EMPLOYEE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
