-- PostgreSQL Database Setup Script
-- Run this in PostgreSQL to create the database and user

-- Create database if it doesn't exist
CREATE DATABASE sellit;

-- Connect to the sellit database
\c sellit;

-- Create a user if needed (optional, can use postgres user)
-- CREATE USER sellit_user WITH PASSWORD 'root123';
-- GRANT ALL PRIVILEGES ON DATABASE sellit TO sellit_user;

-- Note: If using default postgres user, make sure password is set to 'root123'
-- To set password: ALTER USER postgres WITH PASSWORD 'root123';

