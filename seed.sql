-- USERS
INSERT INTO Basic_user (first_name, nickname, email, password_hash, points, role) VALUES
('Іван', 'ivan123', 'ivan@example.com', 'hash1', 10, 'user'),
('Марія', 'mary_cat', 'maria@example.com', 'hash2', 20, 'user');

-- SHELTERS
INSERT INTO Shelter (address, description) VALUES
('Київ, центр', 'Головний притулок'),
('Львів, район', 'Маленький притулок');

-- CATS
INSERT INTO Cat (shelter_id, name, gender, birth_date, description, status) VALUES
(1, 'Барсік', 'male', '2022-01-01', 'Активний', 'shelter'),
(2, 'Мурка', 'female', '2021-05-10', 'Спокійна', 'shelter');

-- EVENTS
INSERT INTO Event (shelter_id, address, name, event_date, type) VALUES
(1, NULL, 'День відкритих дверей', '2026-05-01 12:00:00', 'opened');

-- REQUESTS
INSERT INTO AdoptionRequest (user_id, cat_id, type, status) VALUES
(1, 1, 'adoption', 'pending');