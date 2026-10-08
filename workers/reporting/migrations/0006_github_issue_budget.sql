/* Shared rolling-hour reservations for issue POSTs, independent of intake and delivery retries. */
CREATE TABLE github_issue_attempts (id TEXT PRIMARY KEY, attempted_at INTEGER NOT NULL);
CREATE INDEX github_issue_attempts_time ON github_issue_attempts(attempted_at);
