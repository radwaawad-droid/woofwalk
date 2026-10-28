-- ============================================================
--  WoofWalk · Walker ID verification
--  Private storage bucket + ID document fields on walker_profiles
--  Run this once in Supabase → SQL Editor
-- ============================================================

-- 1. Add ID document fields to walker_profiles
alter table walker_profiles
  add column if not exists id_document_type text
    check (id_document_type in ('emirates_id', 'passport')),
  add column if not exists id_document_front_path text,
  add column if not exists id_document_back_path text,  -- only used for Emirates ID
  add column if not exists id_document_uploaded_at timestamptz,
  add column if not exists id_verified_at timestamptz,
  add column if not exists id_verified_by uuid references profiles(id);
-- id_verified boolean already exists from an earlier migration; we reuse it.

-- 2. Create private storage bucket for IDs (NOT public — admin + owner only)
insert into storage.buckets (id, name, public)
values ('walker-ids', 'walker-ids', false)
on conflict (id) do nothing;

-- 3. Storage RLS policies — only the walker themselves + admins can touch the files
drop policy if exists "walkers manage own ids"       on storage.objects;
drop policy if exists "walkers read own ids"         on storage.objects;
drop policy if exists "walkers insert own ids"       on storage.objects;
drop policy if exists "walkers update own ids"       on storage.objects;
drop policy if exists "walkers delete own ids"       on storage.objects;
drop policy if exists "admins read all walker ids"   on storage.objects;

-- Walker can insert/update/select/delete files under their own folder (id/*)
create policy "walkers insert own ids" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'walker-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "walkers read own ids" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'walker-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "walkers update own ids" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'walker-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "walkers delete own ids" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'walker-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read every file in the bucket (so they can view IDs on the dashboard)
create policy "admins read all walker ids" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'walker-ids'
    and is_current_user_admin()
  );

-- 4. DEFENCE IN DEPTH: block walkers from editing admin-controlled columns
--    on their own walker_profiles row. Without this, a walker could craft
--    a direct Supabase call to set approval_status = 'approved' on themselves.
create or replace function protect_walker_admin_fields() returns trigger
language plpgsql as $$
declare
  claims_role text;
begin
  -- Service-role requests (our server routes) bypass this entirely
  begin
    claims_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    claims_role := null;
  end;
  if claims_role = 'service_role' then
    return new;
  end if;

  -- Admin users can edit anything
  if is_current_user_admin() then
    return new;
  end if;

  -- Everyone else: preserve the admin-controlled columns
  new.approval_status           := old.approval_status;
  new.approval_notes            := old.approval_notes;
  new.approved_at               := old.approved_at;
  new.approved_by               := old.approved_by;
  new.id_verified               := coalesce(old.id_verified, false);
  new.id_verified_at            := old.id_verified_at;
  new.id_verified_by            := old.id_verified_by;
  new.stripe_charges_enabled    := coalesce(old.stripe_charges_enabled, false);
  new.stripe_payouts_enabled    := coalesce(old.stripe_payouts_enabled, false);
  new.stripe_details_submitted  := coalesce(old.stripe_details_submitted, false);
  return new;
end;
$$;

drop trigger if exists walker_profiles_protect_admin_fields on walker_profiles;
create trigger walker_profiles_protect_admin_fields
  before update on walker_profiles
  for each row execute function protect_walker_admin_fields();

-- Done.

