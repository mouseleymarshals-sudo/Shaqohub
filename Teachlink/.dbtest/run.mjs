import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const MIG_DIR = 'C:/Users/HP/Downloads/Teachlink/supabase/migrations';
const BASE = [
  '20261024123755_create_profiles_jobs_applications.sql',
  '20261024123807_add_teachlink_profile_avatars.sql',
  '20261024123811_add_saved_jobs_and_notifications.sql',
  '20261024123820_add_auto_profile_trigger_for_oauth.sql',
  '20261024163038_add_teachlink_accounts_uploads_messaging_admin.sql',
  '20261024163053_add_teachlink_message_events.sql',
  '20261024163638_tighten_teachlink_new_table_grants.sql',
];
const NEW = [
  '20261025165809_add_teachlink_privacy_selected_candidates.sql.sql',
  '20261025171019_update_notification_trigger_create_admin.sql.sql',
  '20261025203000_super_admin_recruitment_workflow.sql',
];

function stripExtension(sql) {
  return sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto[^;]*;/gi, '-- pgcrypto provided by harness stubs');
}

const db = new PGlite();
await db.waitReady;
await db.exec(fs.readFileSync(new URL('./stubs.sql', import.meta.url), 'utf8'));
console.log('stubs OK');

for (const file of [...BASE, ...NEW]) {
  const sql = stripExtension(fs.readFileSync(path.join(MIG_DIR, file), 'utf8'));
  try {
    await db.exec(sql);
    console.log('OK  ', file);
  } catch (error) {
    console.error('FAIL', file);
    console.error(error.message);
    process.exitCode = 1;
    break;
  }
}

if (!process.exitCode) {
  const version = await db.query('select current_user, current_setting(\'search_path\')');
  console.log(version.rows);
  const admin = await db.query("select id, email, is_super_admin, role, registration_status from public.profiles where email = 'admin@teachlink.app'");
  console.log('admin profile:', admin.rows);
  const identity = await db.query("select provider, provider_id from auth.identities");
  console.log('identities:', identity.rows);
  const tables = await db.query("select tablename from pg_tables where schemaname = 'public' order by 1");
  console.log('public tables:', tables.rows.map((r) => r.tablename).join(', '));
}
await db.close();
