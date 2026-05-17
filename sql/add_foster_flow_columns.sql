-- Run on existing DBs (from feature/user-foster-flow). Skip any line that errors if column exists.

ALTER TABLE adoption_request
  ADD COLUMN experience_level VARCHAR(32) NULL AFTER type;

ALTER TABLE adoption_request
  ADD COLUMN start_date DATE NULL AFTER experience_level;

ALTER TABLE adoption_request
  ADD COLUMN end_date DATE NULL AFTER start_date;

ALTER TABLE cat
  ADD COLUMN foster_start_date DATE NULL;

ALTER TABLE cat
  ADD COLUMN foster_end_date DATE NULL;

ALTER TABLE cat
  ADD COLUMN foster_city VARCHAR(255) NULL;

ALTER TABLE cat
  ADD COLUMN foster_comment TEXT NULL;
