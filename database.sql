
-- CLEAN START (optional for dev)
DROP TABLE IF EXISTS Cat_photo;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS AdoptionRequest;
DROP TABLE IF EXISTS Cat;
DROP TABLE IF EXISTS Shelter;
DROP TABLE IF EXISTS Basic_user;

-- TABLE: Basic_user
CREATE TABLE Basic_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    points INT DEFAULT 0,
    role ENUM('user', 'admin') DEFAULT 'user'
);

-- TABLE: Shelter
CREATE TABLE Shelter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address TEXT NOT NULL,
    description TEXT
);

-- TABLE: Cat
CREATE TABLE Cat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shelter_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female'),
    birth_date DATE,
    description TEXT,
    status ENUM('shelter', 'private') NOT NULL,

    CONSTRAINT fk_cat_shelter
        FOREIGN KEY (shelter_id)
        REFERENCES Shelter(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_cat_shelter ON Cat(shelter_id);

-- TABLE: AdoptionRequest
CREATE TABLE AdoptionRequest (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cat_id INT NOT NULL,
    type ENUM('foster', 'adoption') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_request_user
        FOREIGN KEY (user_id)
        REFERENCES Basic_user(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_request_cat
        FOREIGN KEY (cat_id)
        REFERENCES Cat(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_request_user ON AdoptionRequest(user_id);
CREATE INDEX idx_request_cat ON AdoptionRequest(cat_id);

-- TABLE: Cat_photo
CREATE TABLE Cat_photo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cat_id INT NOT NULL,
    url TEXT NOT NULL,
    secure_url TEXT,
    width INT,
    height INT,

    CONSTRAINT fk_photo_cat
        FOREIGN KEY (cat_id)
        REFERENCES Cat(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_photo_cat ON Cat_photo(cat_id);

-- TABLE: Event
CREATE TABLE Event (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shelter_id INT NOT NULL,
    address TEXT,
    name VARCHAR(255) NOT NULL,
    event_date DATETIME NOT NULL,
    type ENUM('private', 'opened') NOT NULL,

    CONSTRAINT fk_event_shelter
        FOREIGN KEY (shelter_id)
        REFERENCES Shelter(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_event_shelter ON Event(shelter_id);