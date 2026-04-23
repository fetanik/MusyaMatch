-- USERS
INSERT INTO Basic_user (first_name, nickname, email, password_hash, points, role) VALUES
('Іван', 'ivan123', 'ivan@example.com', 'hash1', 10, 'user'),
('Марія', 'mary_cat', 'maria@example.com', 'hash2', 20, 'user');

-- SHELTERS
INSERT INTO Shelter (address, description) VALUES
('Київ, центр', 'Головний притулок'),
('Львів, район', 'Маленький притулок');

-- CATS - Updated with new fields for smart matching
INSERT INTO Cat (
    shelter_id, 
    name, 
    gender, 
    birth_date, 
    breed,
    age,
    description, 
    status,
    experience_level,
    good_with_kids,
    good_with_pets,
    space_requirements,
    energy_level,
    age_category,
    special_needs,
    care_requirements,
    image_url,
    compatibility_score
) VALUES
-- Барсік - активний кіт для досвідчених власників
(1, 'Барсік', 'male', '2022-01-01', 'Мейн-кун', 3, 'Дуже активний та грайливий кіт. Потребує багато простору та уваги. Ідеальний для досвідчених власників.', 'available', 'experienced', false, true, 'house', 'high', 'adult', false, 'medium', 'https://example.com/barsik.jpg', 85),

-- Мурка - спокійна кішка для першого разу
(2, 'Мурка', 'female', '2021-05-10', 'Британська короткошерста', 2, 'Спокійна та ніжна кішка. Чудово підходить для першого котика. Любить спати та муркотіти.', 'available', 'first_time', true, false, 'apartment', 'low', 'adult', false, 'low', 'https://example.com/murka.jpg', 90),

-- Рижик - грайливе кошеня
(1, 'Рижик', 'male', '2023-01-01', 'Світовий короткошерстий', 1, 'Енергійне кошеня, яке любить гратися. Потребує багато іграшок та уваги.', 'available', 'first_time', true, false, 'apartment_large', 'high', 'kitten', false, 'medium', 'https://example.com/rizhik.jpg', 88),

-- Сніжок - кіт з особливими потребами
(2, 'Сніжок', 'male', '2020-05-10', 'Персидська', 5, 'Спокійний дорослий кіт, потребує регулярного догляду за шерстю. Дуже ласкавий.', 'available', 'experienced', false, false, 'apartment', 'low', 'adult', true, 'high', 'https://example.com/snejok.jpg', 75),

-- Марта - дружелюбна до всіх
(1, 'Марта', 'female', '2020-01-01', 'Сибірська', 4, 'Дуже добра та соціальна кішка. Чудово ладнає з дітьми та іншими тваринами.', 'available', 'first_time', true, true, 'house', 'medium', 'adult', false, 'low', 'https://example.com/marta.jpg', 95),

-- Тигр - великий та спокійний
(2, 'Тигр', 'male', '2019-05-10', 'Норвезька лісова', 6, 'Великий та спокійний кіт. Ідеальний компаньйон для перегляду фільмів.', 'available', 'first_time', true, true, 'apartment_large', 'low', 'senior', false, 'low', 'https://example.com/tigr.jpg', 80),

-- Буся - маленька та енергійна
(1, 'Буся', 'female', '2022-05-10', 'Сфінкс', 2, 'Дружелюбна кішка без шерсті. Потребує особливого догляду за шкірою.', 'available', 'experienced', true, false, 'apartment', 'medium', 'adult', true, 'high', 'https://example.com/busya.jpg', 70),

-- Лео - грайливий дорослий
(2, 'Лео', 'male', '2021-01-01', 'Бенгальська', 3, 'Дуже грайливий кіт, любить активні ігри. Потребує простору для руху.', 'available', 'experienced', false, false, 'house', 'high', 'adult', false, 'medium', 'https://example.com/leo.jpg', 82);

-- EVENTS
INSERT INTO Event (shelter_id, address, name, event_date, type) VALUES
(1, NULL, 'День відкритих дверей', '2026-05-01 12:00:00', 'opened');

-- REQUESTS
INSERT INTO AdoptionRequest (user_id, cat_id, type, status) VALUES
(1, 1, 'adoption', 'pending');