-- ============================================================
--  WoofWalk · Admin dashboard + walker approval
--  Run this once in Supabase → SQL Editor
-- ============================================================

-- 1. Flag admins on the profiles table
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Walker approval state
--    'pending'  = new signup, cannot accept walks yet
--    'approved' = cleared by admin, can accept walks
--    'rejected' = turned down, cannot accept walks (reason stored for the walker to see)
alter table walker_profiles
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approval_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references profiles(id);

-- 3. BACKFILL: every walker who already exists today is grandfathered in as approved.
--    (We don't want to kick anyone off who's already working.)
update walker_profiles
set approval_status = 'approved',
    approved_at = coalesce(approved_at, now())
where approval_status = 'pending'
  and id in (select distinct walker_id from walks where walker_id is not null);

-- 4. Helper to check "am I an admin?" without an RLS recursion loop
create or replace function is_current_user_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 5. Admin read policies — admins can see everything
--    (We drop then recreate so re-running this script is safe.)
drop policy if exists "admins read all profiles"         on profiles;
drop policy if exists "admins read all walker_profiles"  on walker_profiles;
drop policy if exists "admins read all walks"            on walks;
drop policy if exists "admins read all dogs"             on dogs;
drop policy if exists "admins read all reviews"          on reviews;

create policy "admins read all profiles"
  on profiles for select to authenticated
  using (is_current_user_admin());

create policy "admins read all walker_profiles"
  on walker_profiles for select to authenticated
  using (is_current_user_admin());

create policy "admins read all walks"
  on walks for select to authenticated
  using (is_current_user_admin());

create policy "admins read all dogs"
  on dogs for select to authenticated
  using (is_current_user_admin());

-- reviews table is optional — this will silently do nothing if the table doesn't exist
do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'reviews') then
    execute 'create policy "admins read all reviews" on reviews for select to authenticated using (is_current_user_admin())';
  end if;
end $$;

-- 6. SAFETY NET: block pending/rejected walkers from accepting walks at the DB level.
--    (The UI also hides the Accept button, but this is defense in depth.)
create or replace function enforce_walker_approval() returns trigger
language plpgsql as $$
begin
  if new.walker_id is not null
     and (old.walker_id is null or old.walker_id is distinct from new.walker_id)
  then
    if not exists (
      select 1 from walker_profiles
      where id = new.walker_id and approval_status = 'approved'
    ) then
      raise exception 'Walker is not approved to accept walks yet';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists walks_enforce_walker_approval on walks;
create trigger walks_enforce_walker_approval
  before update on walks
  for each row execute function enforce_walker_approval();

-- 7. Make yourself the first admin.
--    REPLACE 'you@example.com' with the email you signed up with.
--    Run this AFTER everything above completes without errors.
--
--  update profiles set is_admin = true
--    where id = (select id from auth.users where email = 'you@example.com');

-- Done.
