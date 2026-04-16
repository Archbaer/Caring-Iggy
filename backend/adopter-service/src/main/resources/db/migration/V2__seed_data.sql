-- V2__seed_data.sql
-- Test adopters for Caring Iggy

INSERT INTO adopters (id, name, telephone, email, address, status_id, preferences, interested_animals, created_at, updated_at) VALUES
    ('a50d175a-2827-466e-876e-abba0b98df5e', 'Alice Brown', '+1-555-2001', 'alice.brown@email.com', '101 Maple Drive, San Jose, CA 95110', 3, '{"preferredSize": ["MEDIUM", "LARGE"], "hasYard": true, "otherPets": false}', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('f26cbfee-068a-4712-b232-eeed102c254a', 'Charlie Wilson', '+1-555-2002', 'charlie.w@email.com', '202 Cedar Lane, Palo Alto, CA 94301', 1, '{"preferredSize": ["SMALL"], "hasYard": false, "otherPets": true}', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO adoption_history (id, adopter_id, animal_id, adoption_date, notes, created_at) VALUES
    (uuid_generate_v4(), 'a50d175a-2827-466e-876e-abba0b98df5e', 'b1b2c3d4-e5f6-4789-abcd-111111111111', '2023-06-15', 'Buddy found his forever home with Alice!', CURRENT_TIMESTAMP);
