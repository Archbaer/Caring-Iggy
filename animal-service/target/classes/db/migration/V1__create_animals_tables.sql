-- V1__create_animals_tables.sql
-- Animals database schema for Caring Iggy Animal Shelter

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE animal_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO animal_type (name) VALUES ('DOG'), ('CAT'), ('BIRD');

CREATE TABLE animal_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO animal_status (name) VALUES ('AVAILABLE'), ('PENDING'), ('ADOPTED'), ('IN_TREATMENT'), ('DECEASED');

CREATE TABLE animal_size (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO animal_size (name) VALUES ('SMALL'), ('MEDIUM'), ('LARGE');

CREATE TABLE animal_gender (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO animal_gender (name) VALUES ('MALE'), ('FEMALE'), ('UNKNOWN');

CREATE TABLE previous_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    animal_type_id INTEGER REFERENCES animal_type(id),
    breed VARCHAR(255),
    gender_id INTEGER REFERENCES animal_gender(id),
    size_id INTEGER REFERENCES animal_size(id),
    temperament VARCHAR(255),
    status_id INTEGER REFERENCES animal_status(id) DEFAULT 1,
    intake_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    image_url VARCHAR(500),
    previous_owner_id UUID REFERENCES previous_owners(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_animals_status ON animals(status_id);
CREATE INDEX idx_animals_type ON animals(animal_type_id);
CREATE INDEX idx_animals_previous_owner ON animals(previous_owner_id);
CREATE INDEX idx_animals_intake_date ON animals(intake_date);
