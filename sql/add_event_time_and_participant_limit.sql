ALTER TABLE events
  ADD COLUMN event_time TIME NULL AFTER date,
  ADD COLUMN max_participants INT NULL AFTER cost;
