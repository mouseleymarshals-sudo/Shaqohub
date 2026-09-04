import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Feedback';
import { StarIcon } from '../components/Icons';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9',
    period: '/month',
    features: ['Post up to 3 jobs', 'Browse all applicants', 'Basic support'],
    color: 'border-gray-200',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$29',
    period: '/month',
    features: ['Unlimited job posts', 'Priority listing', 'Advanced filters', 'Dedicated support', 'Featured badge'],
    color: 'border-primary-500 ring-2 ring-primary-500/20',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    features: ['Everything in Premium', 'Multi-campus access', 'Bulk hiring tools', 'Analytics dashboard', 'Account manager'],
    color: 'border-gray-200',
  },
];

export function SubscriptionPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!profile || !selected) return;
    setProcessing(true);
    setError(null);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const { error } = await supabase.from('profiles').update({
      subscription_active: true,
      subscription_plan: selected,
      subscription_end_date: endDate.toISOString().split('T')[0],
    }).eq('id', profile.id);

    setProcessing(false);
    if (error) {
      setError('Payment failed. Please try again.');
    } else {
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => navigate('/profile'), 2000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-bounce-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-100 mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="mt-2 text-sm text-gray-500">Your subscription is now active. Redirecting to your profile...</p>
          <div className="mt-4"><Spinner size={20} /></div>
        </div>
      ) : (
        <div className="px-5 py-6">
          <div className="text-center mb-8">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 ring-1 ring-accent-100">
              <StarIcon size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Upgrade to Premium</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Unlock powerful features to find the best teachers faster. Pay securely via Dahabshil.
            </p>
          </div>

          <div className="space-y-3">
            {plans.map((plan, idx) => (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 animate-fade-in ${
                  selected === plan.id ? plan.color + ' shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                } ${plan.popular && selected !== plan.id ? 'border-primary-200' : ''}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                    {plan.popular && (
                      <span className="badge bg-primary-100 text-primary-700">Popular</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="text-success-500 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-700 animate-fade-in">{error}</div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={!selected || processing}
            className="btn-primary w-full mt-6"
          >
            {processing ? (
              <>
                <Spinner size={18} />
                Processing via Dahabshil...
              </>
            ) : selected ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" strokeLinecap="round" /></svg>
                Pay with Dahabshil
              </>
            ) : (
              'Select a Plan'
            )}
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Secure payment powered by Dahabshil. Cancel anytime.
          </p>
        </div>
      )}
    </div>
  );
}
