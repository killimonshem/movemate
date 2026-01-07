# Database Migrations for MoveMate V2

This directory contains SQL migration files for MoveMate V2. These migrations build the foundation for the new authentication and user management system.

## Migration Files

### Phase 1: Authentication Foundation

1. **20260107_001_create_users_table.sql**
   - Creates the main `users` table
   - Supports three roles: `user`, `venue_admin`, `super_admin`
   - Implements Row Level Security (RLS)
   - Auto-update triggers

2. **20260107_002_create_sessions_table.sql**
   - Session management for token-based auth
   - Tracks device info and activity
   - Cleanup functions for expired sessions

3. **20260107_003_create_audit_logs_table.sql**
   - Audit trail for admin actions
   - Immutable logging
   - Helper functions for easy integration

4. **20260107_004_update_venues_table.sql**
   - Adds metadata to existing `venues` table
   - Timezone support (IANA format)
   - Settings JSONB column
   - RLS policies

5. **20260107_005_update_registrations_table.sql**
   - Updates existing `registrations` table
   - User tracking
   - Soft delete/archiving
   - RLS policies

6. **20260107_006_migrate_super_admins.sql**
   - Migrates data from old `super_admins` table
   - Creates audit log entries
   - Preserves existing credentials

## How to Run Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/movemate

# Apply all migrations
supabase db push

# Or apply specific migration
supabase db push --file supabase/migrations/20260107_001_create_users_table.sql
```

### Option 2: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Open each migration file and run in order:
   - Run `20260107_001_create_users_table.sql`
   - Run `20260107_002_create_sessions_table.sql`
   - Run `20260107_003_create_audit_logs_table.sql`
   - Run `20260107_004_update_venues_table.sql`
   - Run `20260107_005_update_registrations_table.sql`
   - Run `20260107_006_migrate_super_admins.sql`

### Option 3: Using psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run each migration
\i supabase/migrations/20260107_001_create_users_table.sql
\i supabase/migrations/20260107_002_create_sessions_table.sql
\i supabase/migrations/20260107_003_create_audit_logs_table.sql
\i supabase/migrations/20260107_004_update_venues_table.sql
\i supabase/migrations/20260107_005_update_registrations_table.sql
\i supabase/migrations/20260107_006_migrate_super_admins.sql
```

## Important Notes

### Order Matters
**Always run migrations in numerical order!** Each migration may depend on previous ones.

### Backup First
Before running migrations on production:
```bash
# Create a backup via Supabase dashboard or:
pg_dump -h db.[YOUR-PROJECT-REF].supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

### Check for Existing Tables
If you already have some of these tables, you may see "already exists" errors. This is safe due to `IF NOT EXISTS` clauses, but review carefully.

### RLS Policies
All tables have Row Level Security enabled. Ensure your service role key is configured correctly in Edge Functions.

## Verification

After running migrations, verify success:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'sessions', 'audit_logs', 'venues', 'registrations');

-- Check users table structure
\d users

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'sessions', 'audit_logs', 'venues', 'registrations');

-- Check if super_admins were migrated
SELECT COUNT(*) as migrated_admins FROM users WHERE role = 'super_admin';
```

## Rollback

If you need to rollback migrations (not recommended for production):

```sql
-- DANGER: This will delete all data in these tables!

-- Drop new tables
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Revert venues table changes (example, adjust as needed)
ALTER TABLE venues DROP COLUMN IF EXISTS address;
ALTER TABLE venues DROP COLUMN IF EXISTS contact_email;
-- ... (repeat for all added columns)

-- Revert registrations table changes
ALTER TABLE registrations DROP COLUMN IF EXISTS registered_by;
ALTER TABLE registrations DROP COLUMN IF EXISTS is_archived;
-- ... (repeat for all added columns)
```

## Troubleshooting

### Error: "relation 'users' already exists"
- This is safe if you've run migrations before
- Verify existing table structure matches expected schema
- Consider if you need to drop and recreate (DANGER: data loss!)

### Error: "permission denied"
- Ensure you're using a database user with sufficient privileges
- Use the `postgres` user or service role

### Error: "function ... already exists"
- Safe to ignore if function definitions match
- Use `CREATE OR REPLACE FUNCTION` in custom migrations

### RLS Policies Not Working
- Verify `auth.uid()` returns the correct user ID
- Check Edge Functions use service role key
- Test policies with different user contexts:
  ```sql
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "user-id-here"}';
  SELECT * FROM users; -- Test what user can see
  ```

## Environment Setup

Ensure these environment variables are set in your Edge Functions:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has RLS bypass)
- `SUPABASE_ANON_KEY` - Anon key (for public access)

## Next Steps

After successful migration:

1. ✅ Deploy Edge Functions (auth-login, auth-verify, auth-logout)
2. ✅ Update frontend to use new authentication
3. ✅ Create initial super admin user
4. ✅ Test authentication flow
5. ✅ Proceed to Phase 2 migrations (venue schedules)

## Support

For migration issues:
- Check Supabase dashboard logs
- Review Edge Function logs
- Verify table structures match schema
- Test RLS policies manually

---

*Generated for MoveMate V2 - Phase 1 Authentication Foundation*
