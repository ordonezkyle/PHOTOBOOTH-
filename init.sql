-- Create database
CREATE DATABASE IF NOT EXISTS photobooth;
USE photobooth;

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  data_url LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);

-- Collages table (for 2x2 or vertical strip layouts)
CREATE TABLE IF NOT EXISTS collages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  format ENUM('2x2', 'vertical') DEFAULT '2x2',
  data_url LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);

-- Sessions table (optional: for tracking capture sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  photo_count INT DEFAULT 0,
  collage_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (collage_id) REFERENCES collages(id) ON DELETE SET NULL,
  INDEX idx_session (session_id)
);
