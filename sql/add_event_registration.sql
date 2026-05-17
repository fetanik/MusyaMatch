CREATE TABLE IF NOT EXISTS event_registration (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  comment TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_event_registration_event (event_id),
  KEY idx_event_registration_user (user_id),
  UNIQUE KEY uq_event_registration_event_user (event_id, user_id)
);
