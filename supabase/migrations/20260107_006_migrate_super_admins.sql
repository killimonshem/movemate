-- Migrate existing super_admins to new users table
-- Preserves existing authentication data

-- Migrate super_admins to users table
INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  email_verified_at
)
SELECT
  email,
  password_hash,
  username AS full_name,
  'super_admin'::TEXT AS role,
  true AS is_active,
  created_at,
  created_at AS email_verified_at  -- Assume existing admins are verified
FROM super_admins
ON CONFLICT (email) DO NOTHING;  -- Skip if email already exists

-- Log the migration for audit purposes
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  changes
)
SELECT
  u.id,
  'migrated_from_super_admins',
  'user',
  u.id,
  jsonb_build_object(
    'source', 'super_admins',
    'migrated_at', NOW()
  )
FROM users u
WHERE u.role = 'super_admin'
  AND u.created_at >= (SELECT MIN(created_at) FROM super_admins);

-- Add comment to super_admins table indicating it's deprecated
COMMENT ON TABLE super_admins IS 'DEPRECATED: Migrated to users table. Keep for historical reference only. Do not use for new authentication.';

-- Optional: Rename super_admins table to prevent accidental use
-- Uncomment after confirming migration success
-- ALTER TABLE super_admins RENAME TO super_admins_deprecated;

COMMENT ON COLUMN users.password_hash IS 'Password hash. Legacy SHA-256 hashes will be migrated to bcrypt on next login.';
