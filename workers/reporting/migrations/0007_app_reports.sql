ALTER TABLE reports ADD COLUMN source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website','app'));
ALTER TABLE reports ADD COLUMN app_category TEXT CHECK (app_category IN ('memory','handoff','sharing','updates','skills-beta','crash','ui'));
ALTER TABLE reports ADD COLUMN destination_repository TEXT;
