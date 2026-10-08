CREATE TABLE contact_messages (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, page TEXT NOT NULL, delivery_status TEXT NOT NULL DEFAULT 'queued', provider_id TEXT);
CREATE INDEX contact_messages_created ON contact_messages(created_at);
