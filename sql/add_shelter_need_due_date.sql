-- Run once on existing databases (column is included in database.sql for fresh installs).
ALTER TABLE shelter_need
  ADD COLUMN due_date DATE NULL AFTER status;
