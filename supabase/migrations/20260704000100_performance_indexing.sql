-- Performance Indexing for Phase 9
-- Creating B-Tree indexes on frequently queried columns

-- 1. Tools table
-- Often searched by name, slug, and status
CREATE INDEX IF NOT EXISTS idx_tools_name ON tools (name);
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools (slug);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools (status);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON tools (category_id);

-- 2. Profiles table
-- Often searched by username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);

-- 3. Comments table
-- Often queried by tool_id and user_id to load comments quickly
CREATE INDEX IF NOT EXISTS idx_comments_tool_id ON comments (tool_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at DESC);

-- 4. Admin Alerts table
-- Often filtered by status = 'open'
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts (status);

-- 5. Notifications table
-- Often queried by user_id and is_read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications (user_id, is_read);
