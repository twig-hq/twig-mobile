-- Twig: one policy per action on reactions, and an index for every foreign key
--
-- Fixes the two findings Supabase's advisor reported after the first deploy.
-- Neither changes what anyone can see or do.
--
-- 1. reactions had two permissive policies for SELECT: reactions_select and
--    the select half of reactions_own (FOR ALL). They become one policy per
--    action with the same rules:
--      read    anyone who can read the thread, plus the author of a reaction
--              while they are an active member of the pair (so a reaction on
--              a post that was later unshared stays visible to its author)
--      add     your own reaction, as an active member, on a thread you can read
--      change  the same, and only your own reaction
--      remove  your own reaction, as an active member
--    The new policies are created before reactions_own is dropped, so if this
--    stops part way the old rules still hold.
--
-- 2. 27 foreign keys had no index whose leading columns are the key's columns
--    in the key's order. Without one, deleting or changing the row a key
--    points at scans the whole child table, and joins along the key can't use
--    an index. Seven of them were covered in practice by an index with the
--    same leading columns in another order (or led by thread_id, which fixes
--    the pair); they get their own index anyway so the advisor stays clean and
--    supabase/tests/12_reactions_and_indexes_test.sql can hold every new key
--    to the same rule.

-- ---------------------------------------------------------------------------
-- 1. Reactions: one policy per action
-- ---------------------------------------------------------------------------

create policy reactions_insert on public.reactions
  for insert to authenticated
  with check (user_id = (select public.app_uid())
              and public.is_active_member(relationship_id)
              and public.can_read_thread(thread_id));

create policy reactions_update on public.reactions
  for update to authenticated
  using (user_id = (select public.app_uid()) and public.is_active_member(relationship_id))
  with check (user_id = (select public.app_uid())
              and public.is_active_member(relationship_id)
              and public.can_read_thread(thread_id));

create policy reactions_delete on public.reactions
  for delete to authenticated
  using (user_id = (select public.app_uid()) and public.is_active_member(relationship_id));

alter policy reactions_select on public.reactions
  using ((user_id = (select public.app_uid()) and public.is_active_member(relationship_id))
         or public.can_read_thread(thread_id));

drop policy reactions_own on public.reactions;

-- ---------------------------------------------------------------------------
-- 2. Foreign-key indexes, in each key's column order
-- ---------------------------------------------------------------------------

-- People and pairs
create index blocks_blocked_idx
  on public.blocks (blocked_id);
create index contact_labels_contact_idx
  on public.contact_labels (contact_id);
create index profiles_avatar_media_idx
  on public.profiles (avatar_media_id);
create index relationships_status_changed_by_idx
  on public.relationships (status_changed_by);
create index relationships_reconnect_requested_by_idx
  on public.relationships (reconnect_requested_by);
create index relationship_invites_accepted_by_idx
  on public.relationship_invites (accepted_by);
create index relationship_invites_relationship_idx
  on public.relationship_invites (relationship_id);
create index consent_events_relationship_user_idx
  on public.consent_events (relationship_id, user_id);

-- Posts, threads and replies
create index moments_prompt_idx
  on public.moments (prompt_id);
create index threads_moment_relationship_idx
  on public.threads (moment_id, relationship_id);
create index threads_discovery_activity_relationship_idx
  on public.threads (discovery_activity_id, relationship_id);
create index messages_thread_relationship_idx
  on public.messages (thread_id, relationship_id);
create index messages_relationship_author_idx
  on public.messages (relationship_id, author_id);
create index messages_media_idx
  on public.messages (media_id);
create index reactions_thread_relationship_idx
  on public.reactions (thread_id, relationship_id);
create index reactions_relationship_user_idx
  on public.reactions (relationship_id, user_id);
create index thread_reads_thread_relationship_idx
  on public.thread_reads (thread_id, relationship_id);
create index thread_reads_relationship_user_idx
  on public.thread_reads (relationship_id, user_id);
create index saved_moments_relationship_saved_by_idx
  on public.saved_moments (relationship_id, saved_by);

-- Discover
create index discovery_prompts_activity_relationship_idx
  on public.discovery_prompts (activity_id, relationship_id);
create index discovery_prompts_relationship_user_idx
  on public.discovery_prompts (relationship_id, user_id);
create index discovery_prompts_library_prompt_idx
  on public.discovery_prompts (library_prompt_id);
create index discovery_responses_media_idx
  on public.discovery_responses (media_id);

-- Connectors, notifications and exports
create index integration_auto_share_relationship_idx
  on public.integration_auto_share (relationship_id);
create index notification_outbox_actor_idx
  on public.notification_outbox (actor_id);
create index notification_outbox_relationship_idx
  on public.notification_outbox (relationship_id);
create index export_jobs_relationship_idx
  on public.export_jobs (relationship_id);
