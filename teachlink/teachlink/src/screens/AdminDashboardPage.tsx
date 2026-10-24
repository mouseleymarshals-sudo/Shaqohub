import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, SubscriptionRequest } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Feedback';

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: accountData }, { data: requestData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    setAccounts((accountData || []) as Profile[]);
    setRequests((requestData || []) as SubscriptionRequest[]);
    setLoading(false);
  };

  useEffect(() => { if (profile?.is_super_admin) void load(); }, [profile]);

  const toggleAccount = async (account: Profile) => {
    if (account.id === profile?.id) return;
    setBusy(account.id);
    await supabase.rpc('set_account_status', { p_user_id: account.id, p_status: account.account_status === 'active' ? 'suspended' : 'active', p_reason: account.account_status === 'active' ? 'Suspended by administrator' : null });
    await load();
    setBusy(null);
  };

  const review = async (request: SubscriptionRequest, status: 'approved' | 'rejected') => {
    setBusy(request.id);
    await supabase.rpc('review_subscription_request', { p_request_id: request.id, p_status: status });
    await load();
    setBusy(null);
  };

  if (!profile?.is_super_admin) return <div className="p-8 text-center text-sm text-gray-500">Administrator access required.</div>;
  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md"><h1 className="text-lg font-bold text-gray-900">Super Admin</h1><p className="text-xs text-gray-500">Manage accounts and verification requests</p></div>
      <div className="space-y-6 px-5 py-5">
        <section><h2 className="mb-3 text-sm font-bold text-gray-900">Dahabshil verification</h2>{requests.length === 0 ? <p className="text-sm text-gray-400">No pending subscription requests.</p> : <div className="space-y-3">{requests.map((request) => { const account = accounts.find((item) => item.id === request.user_id); return <div key={request.id} className="card"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-gray-900">{account?.institution_name || account?.full_name || account?.email || 'Account'}</p><p className="text-xs text-gray-500">{request.plan} · Ref: {request.payment_reference}</p></div><span className="badge bg-accent-100 text-accent-700">Pending</span></div><div className="mt-3 flex gap-2"><button className="btn-primary flex-1 !py-2" disabled={busy === request.id} onClick={() => void review(request, 'approved')}>Approve</button><button className="btn-secondary flex-1 !py-2" disabled={busy === request.id} onClick={() => void review(request, 'rejected')}>Reject</button></div></div>; })}</div>}</section>
        <section><h2 className="mb-3 text-sm font-bold text-gray-900">All accounts</h2><div className="space-y-3">{accounts.map((account) => <div key={account.id} className="card"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700">{account.profile_picture ? <img src={account.profile_picture} alt="" className="h-full w-full object-cover" /> : (account.full_name || account.institution_name || '?')[0].toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{account.full_name || account.institution_name || 'New account'}</p><p className="truncate text-xs text-gray-400">{account.email} · {account.role}</p></div><span className={`badge ${account.account_status === 'active' ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'}`}>{account.account_status}</span></div><button className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold ${account.account_status === 'active' ? 'bg-error-50 text-error-700' : 'bg-success-50 text-success-700'}`} disabled={busy === account.id || account.id === profile.id} onClick={() => void toggleAccount(account)}>{account.account_status === 'active' ? 'Suspend account' : 'Activate account'}</button></div>)}</div></section>
      </div>
    </div>
  );
}
