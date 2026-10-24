/*
# Tighten grants for TeachLink private feature tables

## Overview
The new feature tables were protected by authenticated-only row policies, but their
role grants were broader than necessary. This migration resets those grants and gives
each signed-in client only the operations its screen uses.

## Security
- Removes anon access from subscription requests, conversations, messages, and support data.
- Restricts message updates to the read receipt column only.
- Keeps all row-level participant and administrator policies unchanged.
*/

REVOKE ALL ON public.subscription_requests FROM anon, authenticated;
GRANT SELECT, INSERT ON public.subscription_requests TO authenticated;

REVOKE ALL ON public.conversations FROM anon, authenticated;
GRANT SELECT, INSERT ON public.conversations TO authenticated;

REVOKE ALL ON public.messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

REVOKE ALL ON public.support_threads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_threads TO authenticated;

REVOKE ALL ON public.support_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
