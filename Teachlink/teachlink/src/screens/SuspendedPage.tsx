import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WHATSAPP_URL } from './SupportPage';

export function SuspendedPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-100 text-error-600"><span className="text-2xl">!</span></div>
        <h1 className="mt-5 text-xl font-bold text-gray-900">Account suspended</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">Your account is currently suspended. Contact support to request a review and activation.</p>
        {profile?.suspension_reason && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">Reason: {profile.suspension_reason}</p>}
        <div className="mt-6 space-y-3"><button onClick={() => navigate('/support')} className="btn-primary w-full">Message support</button><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-secondary w-full">Contact admin on WhatsApp</a><button onClick={() => void signOut()} className="w-full py-2 text-sm text-gray-400">Sign out</button></div>
      </div>
    </div>
  );
}
