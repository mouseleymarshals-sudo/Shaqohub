/*
# Add automatic message activity updates

## Overview
Keeps conversation recency and unread alerts synchronized whenever a message is sent.

## Modified tables
- `conversations`: updates `last_message_at` from new messages.
- `notifications`: receives a message alert for the other participant.

## Security
- The trigger runs as a protected database function and cannot be called directly by clients.
- It only writes to the recipient's notification row and the conversation that owns the message.
*/

CREATE OR REPLACE FUNCTION public.notify_message_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_recipient uuid; v_job uuid; v_title text;
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  SELECT CASE WHEN participant_one = NEW.sender_id THEN participant_two ELSE participant_one END, job_id INTO v_recipient, v_job FROM conversations WHERE id = NEW.conversation_id;
  SELECT title INTO v_title FROM jobs WHERE id = v_job;
  INSERT INTO notifications (user_id, type, title, body, job_id) VALUES (v_recipient, 'welcome', 'New message', 'You have a new message about "' || COALESCE(v_title, 'your application') || '".', v_job);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_notify_event ON public.messages;
CREATE TRIGGER messages_notify_event AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_message_event();
REVOKE EXECUTE ON FUNCTION public.notify_message_event() FROM PUBLIC, anon, authenticated;
