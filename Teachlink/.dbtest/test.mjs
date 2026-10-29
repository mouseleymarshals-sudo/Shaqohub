import { createMigratedDb } from './setup.mjs';

const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';
const T3 = '33333333-3333-4333-8333-333333333333';
const S1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const S2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const U1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const J1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const J2 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const A1 = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const A2 = '99999999-9999-4999-8999-999999999999';

let pass = 0;
let fail = 0;
function check(ok, label, detail = '') {
  if (ok) { pass += 1; console.log('PASS', label); }
  else { fail += 1; console.log('FAIL', label, detail); }
}
async function expectError(fn, pattern, label) {
  try {
    await fn();
    check(false, label, '(no error raised)');
  } catch (error) {
    check(pattern.test(error.message), label, `-> ${error.message}`);
  }
}

const db = await createMigratedDb();
const admin = (await db.query("select id from public.profiles where email = 'admin@teachlink.app'")).rows[0].id;

const uid = {
  teacher1: T1, teacher2: T2, teacher3: T3,
  school1: S1, school2: S2, unapproved: U1, admin,
};

async function as(who, fn) {
  const id = who === 'anon' ? null : uid[who] ?? who;
  const role = who === 'anon' ? 'anon' : 'authenticated';
  await db.exec('reset role');
  await db.exec(`set role ${role}`);
  await db.exec(`select set_config('request.jwt.claim.sub', '${id ?? ''}', false)`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function one(sql, params = []) {
  const result = await db.query(sql, params);
  return result.rows[0];
}
async function count(sql, params = []) {
  const row = await one(sql, params);
  return Number(Object.values(row)[0]);
}

// ---------------------------------------------------------------------------
// Seed users, profiles, jobs, applications
// ---------------------------------------------------------------------------
await db.exec(`
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id) values
  ('${T1}', 'teacher1@example.com', '{"role":"school_teacher","full_name":"Teacher One"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('${T2}', 'teacher2@example.com', '{"role":"school_teacher","full_name":"Teacher Two"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('${T3}', 'teacher3@example.com', '{"role":"school_teacher","full_name":"Teacher Three"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('${S1}', 'school1@example.com', '{"role":"school","full_name":"Sunrise"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('${S2}', 'university1@example.com', '{"role":"university","full_name":"University"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('${U1}', 'pending@example.com', '{"role":"school","full_name":"Pending School"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

update public.profiles set
  full_name = 'Teacher One', phone_number = '+252611111111',
  education_level = 'Bachelor of Education', field_of_study = 'Mathematics',
  graduation_year = 2020, subjects_taught = array['Mathematics','Physics'],
  experience_years = 4, city = 'Mogadishu City', is_verified = true
where id = '${T1}';

update public.profiles set
  full_name = 'Teacher Two', phone_number = '+252611111112',
  education_level = 'Master of Science', field_of_study = 'Physics',
  graduation_year = 2018, subjects_taught = array['Physics'],
  experience_years = 6, city = 'Hargeysa State', is_verified = true
where id = '${T2}';

update public.profiles set
  full_name = 'Teacher Three', phone_number = '+252611111113',
  education_level = 'Bachelor of Arts', field_of_study = 'English',
  subjects_taught = array['English'], experience_years = 1,
  city = 'Galmudug State'
where id = '${T3}';

update public.profiles set
  institution_name = 'Sunrise Private School', phone_number = '+252622222222',
  city = 'Hargeysa State', district = 'Ahmed Dhagah',
  registration_status = 'approved', is_verified = true,
  logo = 'https://cdn.example/logo-sunrise.png',
  profile_picture = 'https://cdn.example/profile-sunrise.png'
where id = '${S1}';

update public.profiles set
  institution_name = 'Somali National University', phone_number = '+252633333333',
  city = 'Mogadishu City', registration_status = 'approved', is_verified = true,
  logo = 'https://cdn.example/logo-snu.png'
where id = '${S2}';

update public.profiles set
  institution_name = 'Pending Academy', phone_number = '+252644444444',
  city = 'Puntland State', registration_status = 'pending', is_verified = false,
  logo = 'https://cdn.example/logo-pending.png'
where id = '${U1}';

insert into public.jobs (
  id, posted_by, institution_type, title, description, teacher_type, subjects,
  primary_subjects, secondary_subjects, position_count, salary_amount,
  salary_currency, salary_period, salary_negotiable, location_city,
  location_district, requirements, application_deadline, is_active, approval_status
) values
  ('${J1}', '${S1}', 'school', 'Mathematics Teacher', 'Teach mathematics to grades 7-9.',
   'Full-time', array['Mathematics'], array['Mathematics'], array['Physics'], 2,
   350, 'USD', 'monthly', false, 'Mogadishu City', 'Hodan', array['Bachelor degree'],
   current_date + 30, true, 'approved'),
  ('${J2}', '${S1}', 'school', 'Physics Teacher', 'Teach physics to secondary students.',
   'Part-time', array['Physics'], array['Physics'], array[]::text[], 1,
   null, 'USD', 'monthly', true, 'Hargeysa State', 'Ahmed Dhagah', array['MSc Physics'],
   current_date + 20, true, 'pending');

insert into public.applications (
  id, job_id, applicant_id, resume_path, resume_name, resume_size,
  cover_note, certificates, certificate_paths, admin_review_status, admin_reviewed_at
) values
  ('${A1}', '${J1}', '${T1}', '${T1}/cv.pdf', 'Teacher_One_CV.pdf', 1234,
   'Please call me on +252611111111', array['cert-one.pdf'],
   array['${T1}/certificates/cert-one.pdf'], 'approved', now()),
  ('${A2}', '${J1}', '${T2}', '${T2}/cv.pdf', 'Teacher_Two_CV.pdf', 2345,
   null, array[]::text[], array[]::text[], 'approved', now());
`);

// ---------------------------------------------------------------------------
// 1. Admin bootstrap
// ---------------------------------------------------------------------------
const adminProfile = await one("select id, role, is_super_admin, registration_status, is_verified, account_status from public.profiles where email = 'admin@teachlink.app'");
check(adminProfile?.is_super_admin === true && adminProfile.account_status === 'active', 'Super Admin profile exists and is active');
check(await count('select count(*)::int from auth.identities where user_id = $1', [admin]) === 1, 'Super Admin has an email identity for password sign-in');
const adminUser = await one('select email, email_confirmed_at, encrypted_password from auth.users where id = $1', [admin]);
check(adminUser?.email_confirmed_at !== null && adminUser?.encrypted_password?.length > 0, 'Super Admin auth user is confirmed with a password hash');

// ---------------------------------------------------------------------------
// 2. Employer privacy: contact and identity columns are unreadable
// ---------------------------------------------------------------------------
await as('school1', async () => {
  const allowed = await db.query('select id, education_level, subjects_taught, experience_years, city from public.profiles where id = $1', [T1]);
  check(allowed.rows.length === 1 && allowed.rows[0].education_level === 'Bachelor of Education', 'Employer can read applicant qualifications');
});
await expectError(() => as('school1', () => db.query('select full_name from public.profiles limit 1')), /permission denied for table profiles/, 'Employer cannot read applicant full names');
await expectError(() => as('school1', () => db.query('select phone_number from public.profiles limit 1')), /permission denied for table profiles/, 'Employer cannot read applicant phone numbers');
await expectError(() => as('school1', () => db.query('select email from public.profiles limit 1')), /permission denied for table profiles/, 'Employer cannot read applicant emails');
await expectError(() => as('school1', () => db.query('select institution_name from public.profiles limit 1')), /permission denied for table profiles/, 'Institution names are not exposed through profiles');
await expectError(() => as('school1', () => db.query('select phone_number from public.jobs limit 1')), /permission denied for table jobs/, 'Legacy job phone number column is inaccessible');
await expectError(() => as('school1', () => db.query('select resume_name from public.applications limit 1')), /permission denied for table applications/, 'Employer cannot read CV file names');
await expectError(() => as('school1', () => db.query('select cover_note from public.applications limit 1')), /permission denied for table applications/, 'Employer cannot read cover notes (contact info risk)');
const appView = await db.query('select id, status, reference_code, resume_path, certificate_paths from public.applications order by reference_code');
check(appView.rows.length === 2 && appView.rows.every((r) => /^TL-[A-F0-9]{8}$/.test(r.reference_code)), 'Employer sees anonymous reference codes and file paths');

// ---------------------------------------------------------------------------
// 3. Job visibility and immutability
// ---------------------------------------------------------------------------
check(await as('teacher1', () => count('select count(*)::int from public.jobs')) === 1, 'Teacher sees only approved job posts');
check(await as('school1', () => count('select count(*)::int from public.jobs')) === 2, 'Employer sees its pending job too');
check(await as('admin', () => count('select count(*)::int from public.jobs')) === 2, 'Super Admin sees all job posts');
await as('teacher1', async () => {
  const updated = await db.query("update public.jobs set title = 'hacked' where id = $1", [J1]);
  check(updated.affectedRows === 0, 'Teacher cannot edit an institution job');
});
check((await one('select title from public.jobs where id = $1', [J1])).title === 'Mathematics Teacher', 'Job title is unchanged after attempted edit');

// ---------------------------------------------------------------------------
// 4. Employer can only select/reject through RPCs
// ---------------------------------------------------------------------------
await expectError(() => as('school1', () => db.query("update public.applications set status = 'accepted' where id = $1", [A1])), /permission denied for table applications/, 'Employer cannot directly update application status');
await expectError(() => as('teacher1', () => db.query('select public.accept_applicant($1)', [A1])), /Not authorized/, 'Teacher cannot select themselves');

let sc1;
await as('school1', async () => {
  const result = await db.query('select public.accept_applicant($1) as id', [A1]);
  sc1 = result.rows[0].id;
});
check(!!sc1, 'Employer selection creates a private selected-candidate record');
let scAgain;
await as('school1', async () => {
  scAgain = (await db.query('select public.accept_applicant($1) as id', [A1])).rows[0].id;
});
check(scAgain === sc1, 'Repeated selection is idempotent');
check((await as('school1', () => one('select status from public.applications where id = $1', [A1]))).status === 'accepted', 'Selected application becomes accepted');
check(await as('school1', () => count('select count(*)::int from public.selected_candidates')) === 0, 'Employer cannot read the selected candidates list');
check(await as('teacher1', () => count('select count(*)::int from public.selected_candidates')) === 0, 'Teacher cannot read the selected candidates list');
const candidate = await as('admin', () => one('select applicant_name, applicant_phone, applicant_email, job_title, institution_name, status from public.admin_selected_candidates where id = $1', [sc1]));
check(candidate?.applicant_name === 'Teacher One' && candidate.applicant_phone === '+252611111111' && candidate.applicant_email === 'teacher1@example.com', 'Super Admin sees selected applicant contact details');
check(candidate?.job_title === 'Mathematics Teacher' && candidate.institution_name === 'Sunrise Private School', 'Super Admin sees job and requesting institution details');
check(await as('teacher1', () => count("select count(*)::int from public.notifications where application_id = $1 and type = 'application_accepted'", [A1])) === 1, 'Applicant is notified of selection');
check(await as('teacher2', () => count("select count(*)::int from public.notifications where application_id = $1 and type = 'application_accepted'", [A1])) === 0, 'Other teachers cannot read selection notifications');
await expectError(() => as('admin', () => db.query('update public.selected_candidates set monthly_fee = 1 where id = $1', [sc1])), /permission denied for table selected_candidates/, 'Selected candidates cannot be edited directly even by the admin');
await expectError(() => as('school1', () => db.query('select public.update_selected_candidate($1, $2)', [sc1, 'note'])), /Not authorized/, 'Employer cannot update negotiations');

// ---------------------------------------------------------------------------
// 5. Rejection requires a reason and stays visible to the teacher
// ---------------------------------------------------------------------------
await expectError(() => as('school1', () => db.query("select public.reject_applicant($1, '   ')", [A2])), /rejection reason is required/i, 'Rejection requires a non-empty reason');
await expectError(() => as('teacher2', () => db.query("select public.reject_applicant($1, 'no')", [A2])), /Not authorized/, 'Teacher cannot decide on an application');
await as('school1', () => db.query("select public.reject_applicant($1, 'Not enough classroom experience')", [A2]));
const rejected = await as('teacher2', () => one('select status, rejection_reason from public.applications where id = $1', [A2]));
check(rejected.status === 'rejected' && rejected.rejection_reason === 'Not enough classroom experience', 'Teacher sees status and rejection reason');
const rejectionNote = await as('teacher2', () => one("select body from public.notifications where application_id = $1 and type = 'application_rejected'", [A2]));
check(rejectionNote?.body.includes('Not enough classroom experience'), 'Rejection notification includes the reason');
await expectError(() => as('school1', () => db.query('select public.accept_applicant($1)', [A2])), /already been rejected/, 'A rejected application cannot then be selected');
await expectError(() => as('school1', () => db.query("select public.reject_applicant($1, 'late')", [A1])), /already been selected/, 'A selected application cannot then be rejected');

// ---------------------------------------------------------------------------
// 6. Super Admin negotiation pipeline
// ---------------------------------------------------------------------------
await expectError(() => as('admin', () => db.query("select public.update_selected_candidate($1, null, 'bogus')", [sc1])), /Invalid status/, 'Invalid negotiation status is rejected');
await expectError(() => as('admin', () => db.query("select public.update_selected_candidate($1, null, 'agreement_reached')", [sc1])), /monthly fee/i, 'Agreement requires an agreed fee');
await expectError(() => as('admin', () => db.query("select public.update_selected_candidate($1, null, 'placed')", [sc1])), /must be referred/i, 'Placement is blocked before referral');
await expectError(() => as('admin', () => db.query("select public.update_selected_candidate($1, null, 'referred', 150)", [sc1])), /agreement must be reached/i, 'Referral is blocked before agreement');
await as('admin', () => db.query("select public.update_selected_candidate($1, 'Wants 150 USD', 'agreement_reached', 150)", [sc1]));
let scRow = await one('select negotiation_status, monthly_fee, referral_date from public.selected_candidates where id = $1', [sc1]);
check(scRow.negotiation_status === 'agreement_reached' && Number(scRow.monthly_fee) === 150, 'Agreement reached with monthly fee');
await expectError(() => as('admin', () => db.query("select public.update_selected_candidate($1, null, 'placed')", [sc1])), /must be referred/i, 'Placement is blocked before referral');
await as('admin', () => db.query("select public.update_selected_candidate($1, 'Wants 150 USD', 'referred', 150, 'signed')", [sc1]));
scRow = await one('select negotiation_status, referral_date, contract_status from public.selected_candidates where id = $1', [sc1]);
check(scRow.negotiation_status === 'referred' && scRow.referral_date !== null && scRow.contract_status === 'signed', 'Referral records date and contract status');
await as('admin', () => db.query("select public.update_selected_candidate($1, '', 'placed', 150)", [sc1]));
scRow = await one('select negotiation_status, placed_at, admin_notes, monthly_fee from public.selected_candidates where id = $1', [sc1]);
check(scRow.negotiation_status === 'placed' && scRow.placed_at !== null, 'Placement records timestamp after referral');
check(scRow.admin_notes === null && Number(scRow.monthly_fee) === 150, 'Clearing notes works while the fee is preserved');
await expectError(() => as('admin', () => db.query("select public.update_selected_candidate($1, null, null, null, 'bogus')", [sc1])), /Invalid contract status/, 'Invalid contract status is rejected');
const viewRow = await as('admin', () => one('select status, contract_status, monthly_fee, application_reference from public.admin_selected_candidates where id = $1', [sc1]));
check(viewRow.status === 'placed' && viewRow.contract_status === 'signed' && Number(viewRow.monthly_fee) === 150 && /^TL-/.test(viewRow.application_reference), 'Admin pipeline view exposes final negotiation state');

// ---------------------------------------------------------------------------
// 7. Admin notifications and statistics
// ---------------------------------------------------------------------------
await expectError(() => as('school1', () => db.query("select public.admin_notify_applicant($1, 'Hi', 'Body')", [sc1])), /Not authorized/, 'Employer cannot message selected applicants');
await as('admin', () => db.query("select public.admin_notify_applicant($1, 'Next steps', 'Please call the TeachLink office')", [sc1]));
const adminMsg = await as('teacher1', () => one("select title, body from public.notifications where user_id = $1 and type = 'admin_message' order by created_at desc limit 1", [T1]));
check(adminMsg?.title === 'Next steps' && adminMsg.body.includes('TeachLink office'), 'Super Admin can send in-app notifications to the selected applicant');
await expectError(() => as('school1', () => db.query('select public.admin_dashboard_stats()')), /Not authorized/, 'Employer cannot read platform statistics');
const statsRaw = await as('admin', () => one('select public.admin_dashboard_stats() as stats'));
const stats = typeof statsRaw.stats === 'string' ? JSON.parse(statsRaw.stats) : statsRaw.stats;
check(stats && stats.teachers >= 3 && stats.schools >= 2 && stats.applications === 2 && stats.placements === 1, 'Super Admin dashboard statistics are accurate');
check(await as('school1', () => count('select count(*)::int from public.admin_accounts')) === 0, 'Employer reads zero rows from admin accounts view');
check(await as('school1', () => count('select count(*)::int from public.admin_applications')) === 0, 'Employer reads zero rows from admin applications view');
const adminAccounts = await as('admin', () => db.query('select email, full_name, phone_number from public.admin_accounts'));
check(adminAccounts.rows.some((r) => r.email === 'teacher1@example.com' && r.phone_number === '+252611111111' && r.full_name === 'Teacher One'), 'Super Admin can read full account details');
const adminApps = await as('admin', () => db.query('select reference_code, cover_note, resume_name from public.admin_applications order by reference_code'));
check(adminApps.rows.length === 2 && adminApps.rows.some((r) => r.cover_note?.includes('+252611111111') && r.resume_name === 'Teacher_One_CV.pdf'), 'Super Admin can read cover notes and CV names');

// ---------------------------------------------------------------------------
// 8. Teacher institution wall
// ---------------------------------------------------------------------------
await expectError(() => as('anon', () => db.query('select * from public.list_institution_logos()')), /permission denied for function list_institution_logos/, 'Anonymous users cannot read the institution wall');
const logos = await as('teacher1', () => db.query('select institution_name, logo from public.list_institution_logos()'));
check(logos.rows.length === 2 && logos.rows.every((r) => Object.keys(r).join(',') === 'institution_name,logo'), 'Teacher institution wall returns only names and logos');
check(logos.rows.some((r) => r.institution_name === 'Sunrise Private School' && r.logo.includes('profile-sunrise')), 'Institution wall uses the account profile picture');
check(logos.rows.some((r) => r.institution_name === 'Somali National University' && r.logo.includes('logo-snu')), 'Institution wall falls back to the logo field');
check(!logos.rows.some((r) => r.institution_name === 'Pending Academy' || r.logo.includes('pending')), 'Institution wall excludes unapproved institutions');
check(await as('school1', () => count('select count(*)::int from public.list_institution_logos()')) === 0, 'Institutions cannot see the teacher institution wall');
await expectError(() => as('anon', () => db.query('select * from public.profiles limit 1')), /permission denied for table profiles/, 'Anonymous users cannot query profiles');
await expectError(() => as('anon', () => db.query('select public.get_my_profile()')), /permission denied for function get_my_profile/, 'Anonymous users cannot call get_my_profile');

// ---------------------------------------------------------------------------
// 9. Admin moderation RPCs
// ---------------------------------------------------------------------------
await expectError(() => as('school1', () => db.query("select public.admin_review_institution($1, 'approved')", [U1])), /Not authorized/, 'Employer cannot approve institutions');
await expectError(() => as('admin', () => db.query("select public.admin_review_institution($1, 'approved')", [T1])), /Only institution accounts/, 'Only institution accounts can be reviewed');
await as('admin', () => db.query("select public.admin_review_institution($1, 'approved')", [U1]));
const approvedU1 = await one('select registration_status, is_verified from public.profiles where id = $1', [U1]);
check(approvedU1.registration_status === 'approved' && approvedU1.is_verified === true, 'Super Admin can approve institution registration');
check(await as('teacher1', () => count('select count(*)::int from public.list_institution_logos()')) === 3, 'Approved institution appears on the teacher institution wall');
check(await as('teacher1', () => count("select count(*)::int from public.list_institution_logos() where institution_name = 'Pending Academy'")) === 1, 'Approved institution name is shown with its logo');
await expectError(() => as('school1', () => db.query("select public.admin_review_job($1, 'approved')", [J2])), /Not authorized/, 'Employer cannot approve job posts');
await expectError(() => as('admin', () => db.query("select public.admin_review_job($1, 'live')", [J2])), /Invalid approval status/, 'Invalid job review status is rejected');
await as('admin', () => db.query("select public.admin_review_job($1, 'approved')", [J2]));
const approvedJob = await one('select approval_status, approved_at, approved_by from public.jobs where id = $1', [J2]);
check(approvedJob.approval_status === 'approved' && approvedJob.approved_at !== null && approvedJob.approved_by === admin, 'Super Admin approval records reviewer and timestamp');
check(await as('teacher1', () => count('select count(*)::int from public.jobs')) === 2, 'Newly approved job becomes visible to teachers');
check(await as('school1', () => count("select count(*)::int from public.notifications where type = 'job_review'")) === 1, 'Employer is notified of job review outcomes');

// ---------------------------------------------------------------------------
// 10. Role onboarding limits
// ---------------------------------------------------------------------------
await as('teacher3', () => db.query("select public.set_my_signup_role('school')"));
let t3 = await one('select role, registration_status, is_verified from public.profiles where id = $1', [T3]);
check(t3.role === 'school' && t3.registration_status === 'pending' && t3.is_verified === false, 'New user can switch to an institution role during onboarding');
await expectError(() => as('teacher1', () => db.query("select public.set_my_signup_role('school')")), /Role cannot be changed after applying/, 'Applicant cannot change role after applying');
await expectError(() => as('admin', () => db.query("select public.set_my_signup_role('school')")), /Not authorized/, 'Super Admin cannot use onboarding role switching');
await expectError(() => as('teacher3', () => db.query("select public.set_my_signup_role('admin')")), /Invalid role/, 'Invalid onboarding role is rejected');
await db.query("update public.profiles set created_at = now() - interval '2 days' where id = $1", [T3]);
await expectError(() => as('teacher3', () => db.query("select public.set_my_signup_role('university')")), /during onboarding/, 'Role switching is limited to the first 24 hours');

// ---------------------------------------------------------------------------
// 11. Account CRUD
// ---------------------------------------------------------------------------
await expectError(() => as('school1', () => db.query("select public.admin_create_account('x@y.com', 'Secret123!', 'school')")), /Not authorized/, 'Employer cannot create accounts');
await expectError(() => as('admin', () => db.query("select public.admin_create_account('x@y.com', 'Secret123!', 'admin')")), /Invalid role/, 'Super Admin cannot create unknown roles');
await expectError(() => as('admin', () => db.query("select public.admin_create_account('short@y.com', '123', 'school')")), /at least 6 characters/, 'Password length is enforced');
const newId = (await as('admin', () => one("select public.admin_create_account('new.school@example.com', 'Secret123!', 'school', null, 'New Institute', '+252655555555', 'Puntland State') as id"))).id;
const newProfile = await one('select email, role, institution_name, phone_number, city, registration_status, is_verified from public.profiles where id = $1', [newId]);
check(newProfile.role === 'school' && newProfile.institution_name === 'New Institute' && newProfile.phone_number === '+252655555555' && newProfile.city === 'Puntland State', 'Super Admin can create institution accounts');
check(newProfile.registration_status === 'approved' && newProfile.is_verified === true, 'Admin-created accounts are approved and verified');
check(await count('select count(*)::int from auth.identities where user_id = $1', [newId]) === 1, 'Admin-created accounts have a sign-in identity');
check((await one('select email_confirmed_at from auth.users where id = $1', [newId])).email_confirmed_at !== null, 'Admin-created accounts are email-confirmed');
await expectError(() => as('admin', () => db.query("select public.admin_create_account('new.school@example.com', 'Secret123!', 'school')")), /already exists/, 'Duplicate emails are rejected');
await as('admin', () => db.query("select public.admin_update_account($1, p_city => 'Jubbaland State', p_phone_number => '+252666666666')", [newId]));
let newAfter = await one('select institution_name, phone_number, city, registration_status from public.profiles where id = $1', [newId]);
check(newAfter.institution_name === 'New Institute' && newAfter.phone_number === '+252666666666' && newAfter.city === 'Jubbaland State', 'Admin update preserves fields that are not supplied');
await as('admin', () => db.query("select public.admin_update_account($1, p_role => 'university')", [newId]));
newAfter = await one('select role, registration_status from public.profiles where id = $1', [newId]);
check(newAfter.role === 'university' && newAfter.registration_status === 'pending', 'Changing to an institution role requires re-approval');
await as('admin', () => db.query("select public.admin_update_account($1, p_registration_status => 'approved')", [newId]));
newAfter = await one('select registration_status from public.profiles where id = $1', [newId]);
check(newAfter.registration_status === 'approved', 'Super Admin can approve the updated account');
await as('admin', () => db.query("select public.admin_update_account($1, p_role => 'school_teacher')", [admin]));
const protectedAdmin = await one('select role, registration_status, is_verified from public.profiles where id = $1', [admin]);
check(protectedAdmin.role === 'school' && protectedAdmin.registration_status === 'approved' && protectedAdmin.is_verified === true, 'Admin account cannot be demoted through the edit RPC');
await expectError(() => as('admin', () => db.query('select public.admin_delete_account($1)', [admin])), /cannot delete your own account/, 'Super Admin cannot delete their own account');
await as('admin', () => db.query('select public.admin_delete_account($1)', [newId]));
check(await count('select count(*)::int from public.profiles where id = $1', [newId]) === 0 && await count('select count(*)::int from auth.users where id = $1', [newId]) === 0, 'Admin can delete an account and its auth user');

// ---------------------------------------------------------------------------
// 12. Support is user-to-admin only; messaging is gone
// ---------------------------------------------------------------------------
const threadId = (await as('teacher1', () => one("insert into public.support_threads (requester_id, subject) values ($1, 'Help') returning id", [T1]))).id;
const supportPath = `${T1}/note.pdf`;
await as('teacher1', () => db.query("insert into public.support_messages (thread_id, sender_id, body, attachment_path) values ($1, $2, 'Need help', $3)", [threadId, T1, supportPath]));
await as('teacher1', () => db.query("insert into storage.objects (bucket_id, name) values ('support-attachments', $1)", [supportPath]));
check(await as('teacher2', () => count('select count(*)::int from public.support_messages')) === 0, 'Other teachers cannot read support threads');
await expectError(() => as('teacher2', () => db.query("insert into public.support_messages (thread_id, sender_id, body) values ($1, $2, 'intrude')", [threadId, T2])), /row-level security/, 'Other teachers cannot post into a support thread');
check(await as('school1', () => count('select count(*)::int from public.support_messages')) === 0, 'Employers cannot read a teacher support thread');
check(await as('admin', () => count('select count(*)::int from public.support_messages')) === 1, 'Super Admin can read support messages');
check(await as('teacher1', () => count("select count(*)::int from storage.objects where name = $1", [supportPath])) === 1, 'Requester can read their support attachment');
check(await as('teacher2', () => count("select count(*)::int from storage.objects where name = $1", [supportPath])) === 0, 'Other teachers cannot read a support attachment');
check(await as('admin', () => count("select count(*)::int from storage.objects where name = $1", [supportPath])) === 1, 'Super Admin can read support attachments');
await expectError(() => as('teacher1', () => db.query('select * from public.messages limit 1')), /permission denied for table messages/, 'Direct messaging table is inaccessible');
await expectError(() => as('teacher1', () => db.query('select * from public.conversations limit 1')), /permission denied for table conversations/, 'Conversation table is inaccessible');

// ---------------------------------------------------------------------------
// 12b. Subscription requests survive the column-grant hardening
// ---------------------------------------------------------------------------
await as('teacher1', () => db.query("insert into public.subscription_requests (user_id, plan, payment_reference) values ($1, 'basic', 'PAY-1')", [T1]));
check(await as('teacher1', () => count('select count(*)::int from public.subscription_requests')) === 1, 'Teacher can read their own subscription request');
check(await as('teacher2', () => count('select count(*)::int from public.subscription_requests')) === 0, 'Other teachers cannot read subscription requests');
check(await as('admin', () => count('select count(*)::int from public.subscription_requests')) === 1, 'Super Admin can read all subscription requests');

// ---------------------------------------------------------------------------
// 13. Storage access
// ---------------------------------------------------------------------------
await as('teacher1', () => db.query("insert into storage.objects (bucket_id, name) values ('resumes', $1)", [`${T1}/cv.pdf`]));
await as('teacher1', () => db.query("insert into storage.objects (bucket_id, name) values ('resumes', $1)", [`${T1}/certificates/cert-one.pdf`]));
await expectError(() => as('teacher2', () => db.query("insert into storage.objects (bucket_id, name) values ('resumes', $1)", [`${T1}/stolen.pdf`])), /row-level security/, 'Teacher cannot upload into another teacher folder');
check(await as('school1', () => count("select count(*)::int from storage.objects where name = $1", [`${T1}/cv.pdf`])) === 0, 'Employer cannot download applicant CVs');
check(await as('school1', () => count("select count(*)::int from storage.objects where name = $1", [`${T1}/certificates/cert-one.pdf`])) === 0, 'Employer cannot download applicant certificates');
check(await as('school2', () => count("select count(*)::int from storage.objects where name = $1", [`${T1}/cv.pdf`])) === 0, 'Unrelated institution cannot read the CV');
check(await as('admin', () => count("select count(*)::int from storage.objects where name = $1", [`${T1}/cv.pdf`])) === 1, 'Super Admin can read any CV');
check(await as('teacher2', () => count("select count(*)::int from storage.objects where name = $1", [`${T1}/cv.pdf`])) === 0, 'Other teachers cannot read the CV');

// ---------------------------------------------------------------------------
// 14. Own profile and self-service updates
// ---------------------------------------------------------------------------
const own = await as('teacher1', () => one('select public.get_my_profile() as p'));
const ownProfile = typeof own.p === 'string' ? JSON.parse(own.p) : own.p;
check(ownProfile.full_name === 'Teacher One' && ownProfile.email === 'teacher1@example.com' && ownProfile.phone_number === '+252611111111', 'get_my_profile returns the caller full profile including contact details');
await as('teacher1', async () => {
  const updated = await db.query("update public.profiles set phone_number = '+252655555555' where id = $1", [T1]);
  check(updated.affectedRows === 1, 'Teacher can update their own phone number');
});
await as('teacher1', async () => {
  const updated = await db.query("update public.profiles set phone_number = 'hacked' where id = $1", [T2]);
  check(updated.affectedRows === 0, 'Teacher cannot update another profile');
});
await expectError(() => as('teacher1', () => db.query("update public.profiles set email = 'x@y.com' where id = $1", [T1])), /permission denied for table profiles/, 'Profile email cannot be self-edited');
check((await one('select phone_number from public.profiles where id = $1', [T2])).phone_number === '+252611111112', 'Other profile was not modified');

// ---------------------------------------------------------------------------
// 15. Teacher apply/withdraw, employer post-job, settings, subscriptions
// ---------------------------------------------------------------------------
const J3 = '12345678-1234-4234-8234-123456789012';
await db.exec(`insert into public.jobs (id, posted_by, institution_type, title, description, teacher_type, subjects, primary_subjects, location_city, requirements, application_deadline, is_active, approval_status)
values ('${J3}', '${S2}', 'university', 'Pending Lecturer', 'Pending approval', 'Full-time', array['English'], array['English'], 'Mogadishu City', array['PhD'], current_date + 10, true, 'pending')`);

const applied = await as('teacher3', () => one(
  "insert into public.applications (job_id, applicant_id, resume_path, resume_name, resume_size, cover_note, certificates, certificate_paths) values ($1, $2, $3, 'CV.pdf', 100, 'My phone is +252611111113', array['cert.pdf'], array[$4]) returning id, status, reference_code, rejection_reason",
  [J1, T3, `${T3}/cv.pdf`, `${T3}/certificates/cert.pdf`],
));
check(!!applied.id && applied.status === 'pending' && /^TL-[A-F0-9]{8}$/.test(applied.reference_code), 'Teacher can apply and receives a reference code');
check(await as('teacher1', () => count('select count(*)::int from public.applications')) === 1, 'Teacher only sees their own applications');
check(await as('school1', () => count('select count(*)::int from public.applications')) === 2, 'Employer sees only reviewed applications to its jobs');
await expectError(() => as('teacher3', () => db.query("insert into public.applications (job_id, applicant_id, resume_path) values ($1, $2, 'x')", [J3, T3])), /row-level security/, 'Teacher cannot apply to an unapproved job');
await expectError(() => as('teacher2', () => db.query("insert into public.applications (job_id, applicant_id, resume_path) values ($1, $2, 'x')", [J1, T1])), /row-level security/, 'Teacher cannot apply on behalf of another teacher');
const withdrawn = await as('teacher3', () => db.query('delete from public.applications where id = $1', [applied.id]));
check(withdrawn.affectedRows === 1, 'Teacher can withdraw their pending application');
check(await as('school1', () => count('select count(*)::int from public.applications where id = $1', [applied.id])) === 0, 'Withdrawn application is gone from the employer view');

const posted = await as('school1', () => one(
  "insert into public.jobs (institution_type, title, description, teacher_type, subjects, primary_subjects, position_count, salary_amount, salary_currency, salary_period, salary_negotiable, location_district, location_city, requirements, application_deadline, is_active) values ('school', 'English Teacher', 'Teach English', 'Full-time', array['English'], array['English'], 1, 250, 'USD', 'monthly', false, 'Hodan', 'Mogadishu City', array['BA'], current_date + 15, true) returning id, approval_status, is_active",
));
check(posted.approval_status === 'pending' && posted.is_active === true, 'Employer post starts pending review');
check(await as('teacher1', () => count('select count(*)::int from public.jobs where id = $1', [posted.id])) === 0, 'Pending employer post is hidden from teachers');

const settingsBefore = await as('admin', () => one("select value from public.platform_settings where key = 'default_monthly_fee'"));
check(settingsBefore?.value === '10', 'Super Admin can read platform settings');
await as('admin', () => db.query("update public.platform_settings set value = '15' where key = 'default_monthly_fee'"));
check((await as('admin', () => one("select value from public.platform_settings where key = 'default_monthly_fee'"))).value === '15', 'Super Admin can update platform settings');
check(await as('school1', () => count('select count(*)::int from public.platform_settings')) === 0, 'Employer cannot read platform settings');
await as('school1', async () => {
  const updated = await db.query("update public.platform_settings set value = '99' where key = 'default_monthly_fee'");
  check(updated.affectedRows === 0, 'Employer cannot modify platform settings');
});
check((await one("select value from public.platform_settings where key = 'default_monthly_fee'")).value === '15', 'Platform setting was not modified by the employer');

const sub = await one('select id from public.subscription_requests where payment_reference = $1', ['PAY-1']);
await expectError(() => as('school1', () => db.query("select public.review_subscription_request($1, 'approved')", [sub.id])), /Not authorized/, 'Employer cannot approve subscription payments');
await as('admin', () => db.query("select public.review_subscription_request($1, 'approved')", [sub.id]));
const subAfter = await one('select status, reviewed_by from public.subscription_requests where id = $1', [sub.id]);
check(subAfter.status === 'approved' && subAfter.reviewed_by === admin, 'Super Admin can approve subscription payments');
const subProfile = await one('select subscription_active, subscription_plan from public.profiles where id = $1', [T1]);
check(subProfile.subscription_active === true && subProfile.subscription_plan === 'basic', 'Subscription approval activates the plan');

await as('teacher1', () => db.query('insert into public.saved_jobs (user_id, job_id) values ($1, $2)', [T1, J1]));
check(await as('teacher1', () => count('select count(*)::int from public.saved_jobs')) === 1, 'Teacher can save a job');
check(await as('teacher2', () => count('select count(*)::int from public.saved_jobs')) === 0, 'Saved jobs are private');
await as('teacher1', () => db.query('delete from public.saved_jobs where user_id = $1 and job_id = $2', [T1, J1]));
check(await as('teacher1', () => count('select count(*)::int from public.saved_jobs')) === 0, 'Teacher can remove a saved job');

// ---------------------------------------------------------------------------
// 16. Reference codes
// ---------------------------------------------------------------------------
const refs = await db.query('select reference_code from public.applications order by reference_code');
check(new Set(refs.rows.map((r) => r.reference_code)).size === 2 && refs.rows.every((r) => /^TL-[A-F0-9]{8}$/.test(r.reference_code)), 'Application reference codes are unique and anonymous');

// ---------------------------------------------------------------------------
// 17. Super Admin review gate before employer visibility
// ---------------------------------------------------------------------------
const gateApp = await as('teacher2', () => one(
  `insert into public.applications (job_id, applicant_id, resume_path, resume_name, resume_size, cover_note, certificates, certificate_paths)
   values ($1, $2, $3, 'CV.pdf', 1234, 'Call me on +252611111112', array['cert.pdf'], array[$4])
   returning id, status, admin_review_status`,
  [J1, T2, `${T2}/cv.pdf`, `${T2}/certificates/cert.pdf`],
));
check(gateApp.admin_review_status === 'pending' && gateApp.status === 'pending', 'New applications start awaiting Super Admin review');
check(await as('school1', () => count('select count(*)::int from public.applications where id = $1', [gateApp.id])) === 0, 'Employer cannot read an unreviewed application');
check(await as('school1', () => count('select count(*)::int from public.employer_applications where id = $1', [gateApp.id])) === 0, 'Employer applicant view hides unreviewed applications');
check(await as('admin', () => count("select count(*)::int from public.notifications where application_id = $1 and type = 'new_applicant' and user_id = $2", [gateApp.id, admin])) === 1, 'Super Admin is notified when an application arrives');
check(await as('school1', () => count("select count(*)::int from public.notifications where application_id = $1 and type = 'new_applicant'", [gateApp.id])) === 0, 'Employer is not notified before review');
await expectError(() => as('school1', () => db.query('select public.accept_applicant($1)', [gateApp.id])), /awaiting Super Admin review/, 'Employer cannot accept before review');
await expectError(() => as('school1', () => db.query("select public.reject_applicant($1, 'no')", [gateApp.id])), /awaiting Super Admin review/, 'Employer cannot reject before review');
await expectError(() => as('school1', () => db.query("select public.admin_review_application($1, 'approved')", [gateApp.id])), /Not authorized/, 'Employer cannot review applications');
await expectError(() => as('admin', () => db.query("select public.admin_review_application($1, 'bogus')", [gateApp.id])), /Invalid review decision/, 'Invalid review decision is rejected');
await expectError(() => as('admin', () => db.query("select public.admin_review_application($1, 'rejected')", [gateApp.id])), /reason is required/i, 'Admin rejection requires a reason');
await as('admin', () => db.query("select public.admin_review_application($1, 'approved', 'Strong profile')", [gateApp.id]));
const gateRow = await one('select admin_review_status, admin_reviewed_by, admin_reviewed_at from public.applications where id = $1', [gateApp.id]);
check(gateRow.admin_review_status === 'approved' && gateRow.admin_reviewed_by === admin && gateRow.admin_reviewed_at !== null, 'Admin approval records reviewer and timestamp');
const employerView = await as('school1', () => db.query('select * from public.employer_applications where id = $1', [gateApp.id]));
check(employerView.rows.length === 1, 'Approved application becomes visible to the employer');
check(Object.keys(employerView.rows[0]).sort().join(',') === 'applicant_name,applied_at,id,job_id,job_title,rejection_reason,status', 'Employer view exposes only the applicant name, job, and decision state');
check(employerView.rows[0].applicant_name === 'Teacher Two' && employerView.rows[0].job_title === 'Mathematics Teacher', 'Employer sees the applicant name and job applied for');
check(await as('school1', () => count("select count(*)::int from public.notifications where application_id = $1 and type = 'new_applicant' and user_id = $2", [gateApp.id, S1])) === 1, 'Employer is notified after approval');
await expectError(() => as('admin', () => db.query("select public.admin_review_application($1, 'approved')", [gateApp.id])), /already been reviewed/, 'Reviewed applications cannot be reviewed twice');
const adminGate = await as('admin', () => one('select applicant_phone, applicant_email, cover_note, resume_name, admin_review_status from public.admin_applications where id = $1', [gateApp.id]));
check(adminGate.applicant_phone === '+252611111112' && adminGate.applicant_email === 'teacher2@example.com' && adminGate.cover_note?.includes('+252611111112'), 'Super Admin sees the full application including contact details');

const resetApp = await as('teacher2', () => one(
  `insert into public.applications (job_id, applicant_id, resume_path) values ($1, $2, $3) returning id`,
  [J1, T2, `${T2}/cv-2.pdf`],
));
await as('admin', () => db.query("select public.admin_review_application($1, 'approved')", [resetApp.id]));
check(await as('school1', () => count('select count(*)::int from public.employer_applications where id = $1', [resetApp.id])) === 1, 'Second approved application reaches the employer');
await as('admin', () => db.query("select public.admin_review_application($1, 'pending')", [resetApp.id]));
check((await one('select admin_review_status, admin_reviewed_at from public.applications where id = $1', [resetApp.id])).admin_review_status === 'pending', 'Super Admin can return an approved application to the queue');
check(await as('school1', () => count('select count(*)::int from public.employer_applications where id = $1', [resetApp.id])) === 0, 'Returned application is hidden from the employer again');
await as('admin', () => db.query("select public.admin_review_application($1, 'approved')", [resetApp.id]));

const blockedApp = await as('teacher2', () => one(
  `insert into public.applications (job_id, applicant_id, resume_path, cover_note) values ($1, $2, $3, 'Private note') returning id`,
  [J1, T2, `${T2}/cv-3.pdf`],
));
await as('admin', () => db.query("select public.admin_review_application($1, 'rejected', 'Documents are incomplete')", [blockedApp.id]));
const blockedRow = await as('teacher2', () => one('select status, rejection_reason, admin_review_status from public.applications where id = $1', [blockedApp.id]));
check(blockedRow.status === 'rejected' && blockedRow.admin_review_status === 'rejected' && blockedRow.rejection_reason === 'Documents are incomplete', 'Admin rejection closes the application with a visible reason');
check(await as('school1', () => count('select count(*)::int from public.employer_applications where id = $1', [blockedApp.id])) === 0, 'Admin-rejected application never reaches the employer');
const blockedNote = await as('teacher2', () => one("select body from public.notifications where application_id = $1 and type = 'application_rejected'", [blockedApp.id]));
check(blockedNote?.body.includes('Documents are incomplete') && blockedNote.body.includes('did not pass TeachLink review'), 'Teacher is told the application was blocked during review, with the reason');

let gateSc;
await as('school1', async () => {
  gateSc = (await db.query('select public.accept_applicant($1) as id', [gateApp.id])).rows[0].id;
});
check(!!gateSc, 'Employer can accept a reviewed applicant');
const gateCandidate = await as('admin', () => one('select applicant_name, applicant_phone, job_title from public.admin_selected_candidates where id = $1', [gateSc]));
check(gateCandidate.applicant_name === 'Teacher Two' && gateCandidate.applicant_phone === '+252611111112', 'Accepted reviewed applicant enters the private Super Admin pipeline');

// ---------------------------------------------------------------------------
// 18. Account activation and suspension for every role
// ---------------------------------------------------------------------------
const L1 = 'ffffffff-ffff-4fff-8fff-fffffffffffe';
await db.exec(`insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role, instance_id)
values ('${L1}', 'lecturer1@example.com', '{"role":"university_lecturer","full_name":"Lecturer One"}'::jsonb, '{"provider":"email"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')`);
await expectError(() => as('school1', () => db.query("select public.set_account_status($1, 'suspended')", [T1])), /Not authorized/, 'Employer cannot suspend accounts');
await as('admin', () => db.query("select public.set_account_status($1, 'suspended', 'Policy review')", [T2]));
const suspendedTeacher = await one('select account_status, suspension_reason, suspended_at from public.profiles where id = $1', [T2]);
check(suspendedTeacher.account_status === 'suspended' && suspendedTeacher.suspension_reason === 'Policy review' && suspendedTeacher.suspended_at !== null, 'Super Admin can suspend a teacher account');
check(await as('teacher2', () => count('select count(*)::int from public.list_institution_logos()')) === 0, 'Suspended teacher loses access to the institution wall');
await as('admin', () => db.query("select public.set_account_status($1, 'active')", [T2]));
const activeTeacher = await one('select account_status, suspension_reason from public.profiles where id = $1', [T2]);
check(activeTeacher.account_status === 'active' && activeTeacher.suspension_reason === null, 'Super Admin can reactivate a suspended teacher');
await as('admin', () => db.query("select public.set_account_status($1, 'suspended')", [L1]));
check((await one('select account_status from public.profiles where id = $1', [L1])).account_status === 'suspended', 'Super Admin can suspend a university lecturer');
await as('admin', () => db.query("select public.set_account_status($1, 'active')", [L1]));
await as('admin', () => db.query("select public.set_account_status($1, 'suspended')", [S2]));
check((await one('select account_status from public.profiles where id = $1', [S2])).account_status === 'suspended', 'Super Admin can suspend a university account');
await as('admin', () => db.query("select public.set_account_status($1, 'active')", [S2]));
const roleSet = await as('admin', () => db.query('select distinct role from public.admin_accounts order by role'));
check(roleSet.rows.map((r) => r.role).join(',') === 'school,school_teacher,university,university_lecturer', 'Super Admin account list covers teachers, lecturers, schools, and universities');
check((await as('admin', () => one('select account_status from public.admin_accounts where id = $1', [L1]))).account_status === 'active', 'Reactivated lecturer appears as active in the admin account list');

console.log(`\n${pass} passed, ${fail} failed`);
await db.close();
process.exitCode = fail === 0 ? 0 : 1;
