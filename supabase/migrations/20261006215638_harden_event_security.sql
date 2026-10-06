-- Record security changes applied manually in the SQL Editor on 2026-10-06.
-- These tables are accessed through server functions using service_role.
-- With RLS enabled and no policies, direct anon/authenticated access is denied.
alter table public.event_gift_items enable row level security;
alter table public.event_activity_log enable row level security;

-- Internal trigger functions do not need direct client execution permissions.
-- Revoke PUBLIC too, since its default grants are inherited by other roles.
revoke execute on function
  public.log_rsvp_activity(),
  public.sync_after_guest_delete(),
  public.sync_rsvp_activity_diapers()
from public, anon, authenticated;

grant execute on function
  public.log_rsvp_activity(),
  public.sync_after_guest_delete(),
  public.sync_rsvp_activity_diapers()
to service_role;

-- The function already uses schema-qualified table references.
alter function public.sync_after_guest_delete() set search_path = '';
