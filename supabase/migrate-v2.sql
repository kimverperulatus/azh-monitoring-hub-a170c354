-- Add scanner and custom roles to profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'support', 'scanner', 'custom'));

-- Role page permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  page_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(role, page_key)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage role_permissions"
  ON role_permissions FOR ALL USING (true);

-- Default permissions (insert only if not already there)
INSERT INTO role_permissions (role, page_key, enabled) VALUES
  ('support', 'overview',      true),
  ('support', 'ekv',           true),
  ('support', 'letter_all',    true),
  ('support', 'letter_upload', true),
  ('support', 'logs',          false),
  ('scanner', 'overview',      true),
  ('scanner', 'ekv',           false),
  ('scanner', 'letter_all',    true),
  ('scanner', 'letter_upload', true),
  ('scanner', 'logs',          false),
  ('custom',  'overview',      true),
  ('custom',  'ekv',           false),
  ('custom',  'letter_all',    false),
  ('custom',  'letter_upload', false),
  ('custom',  'logs',          false)
ON CONFLICT (role, page_key) DO NOTHING;

-- Track who uploaded each letter
ALTER TABLE letter_records ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);
