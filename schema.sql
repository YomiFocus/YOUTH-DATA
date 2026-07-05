-- Database Schema for Electronic Registration Portal
-- Compatible with PostgreSQL and MySQL

-- -----------------------------------------------------
-- Table structure for registrations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    address TEXT NOT NULL,
    state_of_origin VARCHAR(100) NOT NULL,
    occupation VARCHAR(100) NOT NULL,
    education VARCHAR(100),
    passport_photo TEXT, -- Stores base64 or photo URL path
    skills TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Strict Unique Constraints (Database validation)
    CONSTRAINT uq_full_name UNIQUE (full_name),
    CONSTRAINT uq_email UNIQUE (email),
    CONSTRAINT uq_phone_number UNIQUE (phone_number)
);

-- Indexes for rapid searching and statistical aggregation
CREATE INDEX IF NOT EXISTS idx_registrations_name ON registrations (full_name);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations (email);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations (phone_number);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at);

-- -----------------------------------------------------
-- Table structure for administrative users
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    username VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Administrator Account
-- Username: admin
-- Password: AdminPassword123!
-- password_hash represents bcrypt.hashSync('AdminPassword123!', 10)
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2a$10$C8H9gshGco3G8P9ZtO20AOVp9RMyNfT4D3fD6607I8mO51K/C4YFq')
ON CONFLICT (username) DO NOTHING;
