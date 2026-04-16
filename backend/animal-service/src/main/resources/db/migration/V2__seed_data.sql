-- V2__seed_data.sql
-- Test data for Caring Iggy Animal Shelter

-- Previous owners
INSERT INTO previous_owners (id, name, telephone, email, address) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-111111111111', 'John Smith', '+1-555-0101', 'john.smith@email.com', '123 Oak Street, San Francisco, CA 94102'),
    ('a1b2c3d4-e5f6-4789-abcd-222222222222', 'Jane Doe', '+1-555-0102', 'jane.doe@email.com', '456 Pine Avenue, Oakland, CA 94612'),
    ('a1b2c3d4-e5f6-4789-abcd-333333333333', 'Bob Johnson', '+1-555-0103', 'bob.j@email.com', '789 Elm Road, Berkeley, CA 94704');

-- Animals (AVAILABLE dogs and cats)
INSERT INTO animals (id, name, date_of_birth, animal_type_id, breed, gender_id, size_id, temperament, status_id, intake_date, description, image_url, previous_owner_id) VALUES
    ('b1b2c3d4-e5f6-4789-abcd-111111111111', 'Buddy', '2021-03-15', 1, 'Golden Retriever', 1, 3, 'Friendly, playful', 1, '2024-01-10', 'A gentle golden boy who loves belly rubs and playing fetch. Great with kids.', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400', 'a1b2c3d4-e5f6-4789-abcd-111111111111'),
    ('b1b2c3d4-e5f6-4789-abcd-222222222222', 'Luna', '2020-07-22', 1, 'German Shepherd', 2, 3, 'Loyal, protective', 1, '2024-02-05', 'Beautiful German Shepherd mix. Well-trained, excellent watchdog.', 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400', NULL),
    ('b1b2c3d4-e5f6-4789-abcd-333333333333', 'Mittens', '2022-01-08', 2, 'Tabby', 2, 1, 'Calm, affectionate', 1, '2024-03-01', 'Adorable tabby cat. Loves sunny windowsills and chin scratches.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', 'a1b2c3d4-e5f6-4789-abcd-222222222222'),
    ('b1b2c3d4-e5f6-4789-abcd-444444444444', 'Max', '2019-11-30', 2, 'Siamese', 1, 2, 'Vocal, social', 1, '2024-01-20', 'Talkative Siamese who will keep you company. Loves attention.', 'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=400', NULL),
    ('b1b2c3d4-e5f6-4789-abcd-555555555555', 'Charlie', '2023-05-12', 1, 'Beagle', 1, 2, 'Curious, friendly', 1, '2024-04-01', 'Young beagle with an excellent nose. Loves outdoor adventures.', 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=400', 'a1b2c3d4-e5f6-4789-abcd-333333333333'),
    ('b1b2c3d4-e5f6-4789-abcd-666666666666', 'Bella', '2020-09-03', 1, 'Labrador', 2, 3, 'Gentle, eager to please', 1, '2024-02-28', 'Sweet Labrador who excels at obedience training. Great family dog.', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400', NULL),
    ('b1b2c3d4-e5f6-4789-abcd-777777777777', 'Oliver', '2021-08-19', 2, 'Persian', 1, 2, 'Docile, quiet', 3, '2024-03-15', 'Fluffy Persian cat. Prefers a calm environment and soft blankets.', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400', NULL),
    ('b1b2c3d4-e5f6-4789-abcd-888888888888', 'Cooper', '2022-12-01', 1, 'Border Collie', 1, 2, 'Energetic, intelligent', 1, '2024-04-10', 'High-energy Border Collie. Needs active owners who love hiking.', 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=400', NULL);
