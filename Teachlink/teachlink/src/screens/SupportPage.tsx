import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { SupportMessage, SupportThread } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Feedback';

const WHATSAPP_URL = 'https://wa.me/252615058053';

export function SupportPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState('Account support');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data: threadData } = await supabase.from('support_threads').select('*').eq('requester_id', profile.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    const current = threadData as SupportThread | null;
    setThread(current);
    if (current) {
      const { data } = await supabase.from('support_messages').select('*').eq('thread_id', current.id).order('created_at', { ascending: true });
      setMessages((data || []) as SupportMessage[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [profile]);

  const send = async () => {
    if (!profile || !body.trim()) return;
    setSending(true);
    setError(null);
    let current = thread;
    if (!current) {
      const { data, error: createError } = await supabase.from('support_threads').insert({ requester_id: profile.id, subject: subject.trim() || 'Account support' }).select('*').maybeSingle();
      if (createError || !data) {
        setError('Could not open a support conversation.');
        setSending(false);
        return;
      }
      current = data as SupportThread;
      setThread(current);
    }
    const { error: messageError } = await supabase.from('support_messages').insert({ thread_id: current.id, sender_id: profile.id, body: body.trim() });
    if (messageError) setError('Could not send your support message.');
    else { setBody(''); await load(); }
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md"><button onClick={() => navigate(-1)} className="text-gray-500">←</button><div><h1 className="text-lg font-bold text-gray-900">Support</h1><p className="text-xs text-gray-500">Contact the TeachLink team</p></div></div>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-2xl bg-primary-50 p-4"><p className="text-sm font-semibold text-primary-900">Need urgent account verification?</p><p className="mt-1 text-xs leading-relaxed text-primary-700">Contact the administrator directly through WhatsApp for Dahabshil payment verification or account activation.</p><a className="btn-primary mt-3 w-full" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Open WhatsApp support</a></div>
        {!thread && <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" />}
        {thread && <div className="space-y-2 rounded-2xl bg-gray-50 p-3">{messages.map((message) => <div key={message.id} className="rounded-xl bg-white p-3 text-sm text-gray-700 shadow-sm"><p>{message.body}</p><p className="mt-1 text-[10px] text-gray-400">{new Date(message.created_at).toLocaleString()}</p></div>)}</div>}
        {error && <p className="text-sm text-error-600">{error}</p>}
        <textarea className="input min-h-28 resize-none" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your support message" />
        <button className="btn-primary w-full" onClick={() => void send()} disabled={sending || !body.trim()}>{sending ? 'Sending...' : 'Send support message'}</button>
      </div>
    </div>
  );
}

export { WHATSAPP_URL };
