import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Conversation, Message, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Spinner } from '../components/Feedback';

export function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThread, setLoadingThread] = useState(!!conversationId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('conversations')
      .select('id, job_id, application_id, participant_one, participant_two, last_message_at, created_at, jobs(title)')
      .order('last_message_at', { ascending: false, nullsFirst: false });
    setConversations((data || []) as unknown as Conversation[]);
    setLoadingConversations(false);
  };

  const loadThread = async (convId: string) => {
    if (!profile) return;
    setLoadingThread(true);
    const { data: conversationData } = await supabase
      .from('conversations')
      .select('id, job_id, application_id, participant_one, participant_two, last_message_at, created_at, jobs(title)')
      .eq('id', convId)
      .maybeSingle();
    const current = conversationData as unknown as Conversation | null;
    setConversation(current);
    if (current) {
      const otherId = current.participant_one === profile.id ? current.participant_two : current.participant_one;
      const { data: person } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
      setOtherProfile(person as Profile | null);
      const { data: messageData } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
      setMessages((messageData || []) as Message[]);
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', convId).neq('sender_id', profile.id).is('read_at', null);
    }
    setLoadingThread(false);
  };

  useEffect(() => {
    void loadConversations();
  }, [profile]);

  useEffect(() => {
    if (conversationId) void loadThread(conversationId);
    else { setConversation(null); setMessages([]); setOtherProfile(null); }
  }, [conversationId, profile]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!profile || !conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        if ((payload.new as Message).sender_id !== profile.id) {
          void supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', (payload.new as Message).id);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile, conversationId]);

  const sendMessage = async () => {
    if (!profile || !conversationId || (!body.trim() && !attachment)) return;
    if (attachment && attachment.size > 4 * 1024 * 1024) {
      setError('Attachments must be 4 MB or smaller.');
      return;
    }
    setSending(true);
    setError(null);
    let attachmentPath: string | null = null;
    if (attachment) {
      const path = `${profile.id}/${conversationId}/${crypto.randomUUID()}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('message-attachments').upload(path, attachment, { contentType: attachment.type });
      if (uploadError) {
        setError('Could not upload the attachment.');
        setSending(false);
        return;
      }
      attachmentPath = path;
    }
    const { error: messageError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      body: body.trim(),
      attachment_path: attachmentPath,
      attachment_name: attachment?.name || null,
      attachment_size: attachment?.size || null,
    });
    if (messageError) {
      setError(messageError.message || 'Could not send the message.');
    } else {
      setBody('');
      setAttachment(null);
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      setMessages((data || []) as Message[]);
      void loadConversations();
    }
    setSending(false);
  };

  if (!conversationId) {
    if (loadingConversations) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
    return (
      <div className="animate-fade-in">
        <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          <p className="text-xs text-gray-500">Talk directly about applications</p>
        </div>
        <div className="px-5 py-4">
          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              message="Conversations start when you apply for a job or receive an application. Tap the Message button on an application to start chatting."
              icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M20 15a4 4 0 01-4 4H9l-5 3v-7a4 4 0 01-1-3V7a4 4 0 014-4h9a4 4 0 014 4z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
          ) : (
            <div className="space-y-3">
              {conversations.map((item) => (
                <button key={item.id} onClick={() => navigate(`/messages/${item.id}`)} className="card-hover w-full text-left">
                  <p className="font-semibold text-gray-900">{item.jobs?.title || 'Job application'}</p>
                  <p className="mt-1 text-xs text-gray-400">{item.last_message_at ? new Date(item.last_message_at).toLocaleString() : 'Start the conversation'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loadingThread) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col animate-fade-in">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur-md">
        <button onClick={() => navigate('/messages')} className="text-gray-500 hover:text-gray-900 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-gray-900">{otherProfile?.full_name || otherProfile?.institution_name || 'Conversation'}</h1>
          <p className="truncate text-xs text-gray-400">{conversation?.jobs?.title || 'Job application'}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !loadingThread && (
          <p className="py-8 text-center text-sm text-gray-400">No messages yet. Say hello to start the conversation.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === profile?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
              {message.attachment_path && <AttachmentLink path={message.attachment_path} name={message.attachment_name || 'Attachment'} />}
              <p className={`mt-1 text-[10px] ${message.sender_id === profile?.id ? 'text-white/60' : 'text-gray-400'}`}>{new Date(message.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 bg-white px-5 py-3 pb-24">
        {attachment && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
            <span className="truncate text-xs text-primary-600">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-xs text-gray-400 hover:text-error-600">Remove</button>
          </div>
        )}
        {error && <p className="mb-2 text-xs text-error-600">{error}</p>}
        <div className="flex items-end gap-2">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200">
            <input type="file" className="hidden" accept="image/*,.pdf,.txt" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </label>
          <textarea
            className="input min-h-11 flex-1 resize-none"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}
            placeholder="Type a message..."
            rows={1}
          />
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
            onClick={() => void sendMessage()}
            disabled={sending || (!body.trim() && !attachment)}
          >
            {sending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentLink({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from('message-attachments').createSignedUrl(path, 300).then(({ data }) => setUrl(data?.signedUrl || null));
  }, [path]);
  return url ? <a href={url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs underline">{name}</a> : <span className="mt-2 block text-xs opacity-70">{name}</span>;
}
