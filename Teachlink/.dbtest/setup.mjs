import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const MIG_DIR = 'C:/Users/HP/Downloads/Teachlink/supabase/migrations';
export const BASE = [
  '20261024123755_create_profiles_jobs_applications.sql',
  '20261024123807_add_teachlink_profile_avatars.sql',
  '20261024123811_add_saved_jobs_and_notifications.sql',
  '20261024123820_add_auto_profile_trigger_for_oauth.sql',
  '20261024163038_add_teachlink_accounts_uploads_messaging_admin.sql',
  '20261024163053_add_teachlink_message_events.sql',
  '20261024163638_tighten_teachlink_new_table_grants.sql',
];
export const NEW = [
  '20261025165809_add_teachlink_privacy_selected_candidates.sql.sql',
  '20261025171019_update_notification_trigger_create_admin.sql.sql',
  '20261025203000_super_admin_recruitment_workflow.sql',
  '20261026090000_admin_application_review_gate.sql',
];

function stripExtension(sql) {
  return sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto[^;]*;/gi, '-- pgcrypto provided by harness stubs');
}

export async function createMigratedDb({ includeBase = true } = {}) {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(fs.readFileSync(new URL('./stubs.sql', import.meta.url), 'utf8'));

  if (process.env.DBTEST_SYNC) {
    // Simulate a legacy live database (BASE only) synced once with supabase/live-setup.sql.
    for (const file of BASE) {
      await db.exec(stripExtension(fs.readFileSync(path.join(MIG_DIR, file), 'utf8')));
    }
    const syncSql = stripExtension(fs.readFileSync(path.join(MIG_DIR, '..', 'live-setup.sql'), 'utf8'));
    try {
      await db.exec(syncSql);
    } catch (error) {
      throw new Error(`live-setup.sql failed: ${error.message}`);
    }
    return db;
  }

  const files = includeBase ? [...BASE, ...NEW] : NEW;
  for (const file of files) {
    const sql = stripExtension(fs.readFileSync(path.join(MIG_DIR, file), 'utf8'));
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}`);
    }
  }
  return db;
}
