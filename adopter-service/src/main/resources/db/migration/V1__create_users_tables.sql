-- V1__create_users_tables.sql
-- Users database schema for Caring Iggy Animal Shelter

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE employee_role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO employee_role (name) VALUES ('ORG_HEAD'), ('EMPLOYEE');

CREATE TABLE adopter_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO adopter_status (name) VALUES ('ACTIVE'), ('PENDING_REVIEW'), ('APPROVED'), ('REJECTED'), ('INACTIVE');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telephone VARCHAR(50),
    role_id INTEGER REFERENCES employee_role(id) DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adopters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    status_id INTEGER REFERENCES adopter_status(id) DEFAULT 1,
    preferences JSONB,
    interested_animals UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT max_interested_animals CHECK (array_length(interested_animals, 1) <= 3)
);

CREATE TABLE adoption_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adopter_id UUID REFERENCES adopters(id) ON DELETE CASCADE,
    animal_id UUID NOT NULL,
    adoption_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_adopters_status ON adopters(status_id);
CREATE INDEX idx_adopters_name ON adopters(name);
CREATE INDEX idx_adopters_telephone ON adopters(telephone);
CREATE INDEX idx_adoption_history_adopter ON adoption_history(adopter_id);
CREATE INDEX idx_adoption_history_animal ON adoption_history(animal_id);
CREATE INDEX idx_adoption_history_date ON adoption_history(adoption_date);
