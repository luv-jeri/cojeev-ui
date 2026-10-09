/* Shared rolling-hour reservations for issue POSTs, independent of intake and delivery retries. */
CREATE TABLE github_issue_attempts (id TEXT PRIMARY KEY, attempted_at INTEGER NOT NULL);
CREATE INDEX github_issue_attempts_time ON github_issue_attempts(attempted_at);
/* Deployed GitHub jobs did not record POST timestamps; preserve their duplicate scan. */
UPDATE outbox SET first_attempt_at=created_at
WHERE kind='github' AND first_attempt_at IS NULL AND attempts>0;
