import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Notification } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/Feedback';

const iconMap: Record<string, { bg: string; fg: string; svg: React.ReactNode }> = {
  application_accepted: {
    bg: 'bg-success-100',
    fg: 'text-success-600',
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  application_rejected: {
    bg: 'bg-error-100',
    fg: 'text-error-600',
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  new_applicant: {
    bg: 'bg-primary-100',
    fg: 'text-primary-600',
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  job_deadline: {
    bg: 'bg-accent-100',
    fg: 'text-accent-600',
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>,
  },
  welcome: {
    bg: 'bg-primary-100',
    fg: 'text-primary-600',
    svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 7l9-4 9 4M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
};

export function NotificationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error.message);
    } else {
      setNotifications((data || []) as Notification[]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    fetchNotifications();
  };

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) {
      supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }
    if (notif.job_id) {
      navigate(`/jobs/${notif.job_id}`);
    }
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-500">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs font-medium text-primary-600 hover:underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card !p-3 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            title="No notifications yet"
            message="You'll be notified here when your application status changes or when someone applies to your jobs."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((notif, idx) => {
              const icon = iconMap[notif.type] || iconMap.welcome;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 animate-fade-in ${
                    notif.is_read
                      ? 'bg-white border-gray-100 hover:shadow-sm'
                      : 'bg-primary-50/50 border-primary-100 hover:bg-primary-50'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.bg} ${icon.fg}`}>
                      {icon.svg}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{notif.title}</p>
                        {!notif.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 leading-snug">{notif.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleDateString()} · {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
