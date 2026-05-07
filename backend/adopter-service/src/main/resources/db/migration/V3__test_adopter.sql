-- V3__test_adopter.sql
-- Test adopter with known account (password: password123)

INSERT INTO adopters (id, name, telephone, email, address, status_id, preferences, interested_animals, created_at, updated_at) VALUES
    ('cccccccc-1111-4111-8111-111111111111', 'Test Adopter', '+1-555-9003', 'testadopter@caringiggy.test', '123 Test Lane, Austin, TX 78701', 3, '{}', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
