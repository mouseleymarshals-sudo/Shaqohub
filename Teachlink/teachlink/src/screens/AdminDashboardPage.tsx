import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, SubscriptionRequest, SelectedCandidate, Job } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Feedback';

interface SelectedWithDetails extends SelectedCandidate {
  applicant: Profile | null;
  employer: Profile | null;
  job: Pick<Job, 'id' | 'title' | 'institution_type' | 'location_city' | 'location_village'> | null;
}

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'candidates' | 'accounts' | 'subscriptions'>('candidates');
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [candidates, setCandidates] = useState<SelectedWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<SelectedWithDetails | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editFee, setEditFee] = useState('');

  const load = async () => {
    const [{ data: accountData }, { data: requestData }, { data: candidateData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('selected_candidates').select('*').order('selected_at', { ascending: false }),
    ]);
    setAccounts((accountData || []) as Profile[]);
    setRequests((requestData || []) as SubscriptionRequest[]);

    const scList = (candidateData || []) as SelectedCandidate[];
    if (scList.length > 0) {
      const applicantIds = [...new Set(scList.map((sc) => sc.applicant_id))];
      const employerIds = [...new Set(scList.map((sc) => sc.employer_id))];
      const jobIds = [...new Set(scList.map((sc) => sc.job_id))];

      const [{ data: applicants }, { data: employers }, { data: jobs }] = await Promise.all([
        supabase.from('profiles').select('*').in('id', applicantIds),
        supabase.from('profiles').select('*').in('id', employerIds),
        supabase.from('jobs').select('id, title, institution_type, location_city, location_village').in('id', jobIds),
      ]);

      const applicantMap = new Map<string, Profile>();
      (applicants || []).forEach((p: Profile) => applicantMap.set(p.id, p));
      const employerMap = new Map<string, Profile>();
      (employers || []).forEach((p: Profile) => employerMap.set(p.id, p));
      const jobMap = new Map<string, Pick<Job, 'id' | 'title' | 'institution_type' | 'location_city' | 'location_village'>>();
      (jobs || []).forEach((j) => jobMap.set(j.id, j));

      const enriched: SelectedWithDetails[] = scList.map((sc) => ({
        ...sc,
        applicant: applicantMap.get(sc.applicant_id) || null,
        employer: employerMap.get(sc.employer_id) || null,
        job: jobMap.get(sc.job_id) || null,
      }));
      setCandidates(enriched);
    } else {
      setCandidates([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (profile?.is_super_admin) void load(); }, [profile]);

  const toggleAccount = async (account: Profile) => {
    if (account.id === profile?.id) return;
    setBusy(account.id);
    await supabase.rpc('set_account_status', {
      p_user_id: account.id,
      p_status: account.account_status === 'active' ? 'suspended' : 'active',
      p_reason: account.account_status === 'active' ? 'Suspended by administrator' : null,
    });
    await load();
    setBusy(null);
  };

  const review = async (request: SubscriptionRequest, status: 'approved' | 'rejected') => {
    setBusy(request.id);
    await supabase.rpc('review_subscription_request', { p_request_id: request.id, p_status: status });
    await load();
    setBusy(null);
  };

  const saveCandidate = async () => {
    if (!editingCandidate) return;
    setBusy(editingCandidate.id);
    await supabase.rpc('update_selected_candidate', {
      p_sc_id: editingCandidate.id,
      p_notes: editNotes.trim() || null,
      p_status: editStatus || null,
      p_fee: editFee ? Number(editFee) : null,
    });
    setEditingCandidate(null);
    await load();
    setBusy(null);
  };

  if (!profile?.is_super_admin) return <div className="p-8 text-center text-sm text-gray-500">Administrator access required.</div>;
  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="animate-fade-in pb-20">
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md">
        <h1 className="text-lg font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-xs text-gray-500">Manage selected candidates, accounts, and subscriptions</p>
      </div>

      <div className="flex gap-2 px-5 py-3 border-b border-gray-100 overflow-x-auto">
        {([
          { key: 'candidates', label: `Selected (${candidates.length})` },
          { key: 'accounts', label: `Accounts (${accounts.length})` },
          { key: 'subscriptions', label: `Subscriptions (${requests.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'candidates' && (
        <div className="px-5 py-4 space-y-3">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-gray-300 mb-3"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M22 11l-3 3-2-2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <p className="text-sm font-medium text-gray-500">No selected candidates yet</p>
              <p className="mt-1 text-xs text-gray-400">When employers select applicants, they will appear here for your review.</p>
            </div>
          ) : (
            candidates.map((sc) => {
              const applicant = sc.applicant;
              const employer = sc.employer;
              const job = sc.job;
              const statusStyles: Record<string, string> = {
                pending: 'bg-accent-100 text-accent-700',
                contacted: 'bg-primary-100 text-primary-700',
                agreed: 'bg-success-100 text-success-700',
                referred: 'bg-gray-800 text-white',
              };
              return (
                <div key={sc.id} className="card animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700">
                      {applicant?.profile_picture ? (
                        <img src={applicant.profile_picture} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{applicant?.full_name?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{applicant?.full_name || 'Unknown applicant'}</h3>
                      <p className="text-xs text-gray-500 truncate">
                        {applicant?.education_level || ''} {applicant?.field_of_study ? `· ${applicant.field_of_study}` : ''}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`badge ${statusStyles[sc.negotiation_status] || 'bg-gray-100 text-gray-600'}`}>{sc.negotiation_status}</span>
                        {sc.monthly_fee && <span className="badge bg-success-50 text-success-700">${sc.monthly_fee}/mo</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-xs">
                    <div>
                      <span className="text-gray-400">Job Title</span>
                      <p className="font-medium text-gray-700 truncate">{job?.title || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Institution Type</span>
                      <p className="font-medium text-gray-700 capitalize">{job?.institution_type || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">School/University</span>
                      <p className="font-medium text-gray-700 truncate">{employer?.institution_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Location</span>
                      <p className="font-medium text-gray-700 truncate">
                        {job?.location_city ? `${job.location_city}${job.location_village ? ', ' + job.location_village : ''}` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Phone</span>
                      <p className="font-medium text-gray-700">{applicant?.phone_number || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Email</span>
                      <p className="font-medium text-gray-700 truncate">{applicant?.email || '—'}</p>
                    </div>
                  </div>

                  {sc.admin_notes && (
                    <p className="mt-2 rounded-lg bg-primary-50 p-2 text-xs text-primary-700">{sc.admin_notes}</p>
                  )}

                  <button
                    onClick={() => {
                      setEditingCandidate(sc);
                      setEditNotes(sc.admin_notes || '');
                      setEditStatus(sc.negotiation_status);
                      setEditFee(sc.monthly_fee ? String(sc.monthly_fee) : '');
                    }}
                    className="btn-secondary mt-3 w-full !py-2 text-xs"
                  >
                    Update negotiation details
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'accounts' && (
        <div className="px-5 py-4 space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700">
                  {account.profile_picture ? <img src={account.profile_picture} alt="" className="h-full w-full object-cover" /> : (account.full_name || account.institution_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{account.full_name || account.institution_name || 'New account'}</p>
                  <p className="truncate text-xs text-gray-400">{account.email} · {account.role}</p>
                </div>
                <span className={`badge ${account.account_status === 'active' ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'}`}>{account.account_status}</span>
              </div>
              <button
                className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold ${account.account_status === 'active' ? 'bg-error-50 text-error-700' : 'bg-success-50 text-success-700'}`}
                disabled={busy === account.id || account.id === profile.id}
                onClick={() => void toggleAccount(account)}
              >
                {busy === account.id ? <Spinner size={14} /> : account.account_status === 'active' ? 'Suspend account' : 'Activate account'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="px-5 py-4 space-y-3">
          {requests.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No pending subscription requests.</p>
          ) : (
            requests.map((request) => {
              const account = accounts.find((item) => item.id === request.user_id);
              return (
                <div key={request.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{account?.institution_name || account?.full_name || account?.email || 'Account'}</p>
                      <p className="text-xs text-gray-500">{request.plan} · Ref: {request.payment_reference}</p>
                    </div>
                    <span className="badge bg-accent-100 text-accent-700">Pending</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-primary flex-1 !py-2" disabled={busy === request.id} onClick={() => void review(request, 'approved')}>Approve</button>
                    <button className="btn-secondary flex-1 !py-2" disabled={busy === request.id} onClick={() => void review(request, 'rejected')}>Reject</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setEditingCandidate(null)}>
          <div className="w-full rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Negotiation Details</h3>
              <button onClick={() => setEditingCandidate(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Candidate</label>
                <p className="text-sm font-medium text-gray-700">{editingCandidate.applicant?.full_name || '—'}</p>
              </div>
              <div>
                <label className="label">Negotiation Status</label>
                <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="agreed">Agreed</option>
                  <option value="referred">Referred to school</option>
                </select>
              </div>
              <div>
                <label className="label">Monthly Fee (USD)</label>
                <input className="input" type="number" placeholder="e.g. 10" value={editFee} onChange={(e) => setEditFee(e.target.value)} />
              </div>
              <div>
                <label className="label">Admin Notes</label>
                <textarea className="input min-h-24 resize-none" placeholder="Notes about your negotiation with this candidate..." value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
              <button onClick={() => void saveCandidate()} disabled={busy === editingCandidate.id} className="btn-primary w-full">
                {busy === editingCandidate.id ? <Spinner size={18} /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
