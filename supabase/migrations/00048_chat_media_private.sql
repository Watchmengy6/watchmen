-- ===========================================================
-- 00048 — P0.2: make chat-media private
-- ===========================================================
-- RUN THIS LAST — only AFTER the signed-URL code (signChatMedia +
-- signThreadMediaAction + the page/realtime wiring) is deployed and you've
-- verified chat images load in a DM, a group chat, and an event room.
--
-- Before: chat-media bucket is public, so any DM/group/event image is
-- fetchable by URL forever, with no auth, even after block/leave/delete.
-- After: bucket is private; images load only via short-lived signed URLs
-- minted server-side for verified thread members (see
-- src/lib/uploads/signChatMedia.ts). Service-role signing is pre-authorized,
-- so it keeps working with no authenticated SELECT policy on the objects.
--
-- avatars and event-images are intentionally LEFT PUBLIC (member directory
-- needs avatar CDN URLs; event flyers are meant to be broadly visible).
--
-- Reversible: set public = true and recreate the "chat-media read" policy.

update storage.buckets set public = false where id = 'chat-media';

-- The broad "read anyone" policy is no longer needed (and shouldn't exist
-- on a private bucket). Signed URLs bypass RLS, so dropping this does not
-- affect legitimate viewing. Write/delete policies are unchanged.
drop policy if exists "chat-media read" on storage.objects;
