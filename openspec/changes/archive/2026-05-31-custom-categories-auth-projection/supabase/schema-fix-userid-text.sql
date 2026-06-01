-- ============================================================================
-- Finance Dashboard — Schema FIX (v2: drops all existing policies first)
-- ============================================================================
-- Problem: The original schema declared `user_id` as `uuid`, but Clerk's
-- user.id is a string like "user_3EWGG9rtW9fiLwfl0KI9XkSOldk" — NOT a UUID.
-- Inserts from the app fail with:
--   "invalid input syntax for type uuid: 'user_3EWGG9rtW9fiLwfl0KI9XkSOldk'"
--
-- Postgres refuses to alter a column type while a policy depends on it:
--   "cannot alter type of a column used in a policy definition"
-- So we must drop ALL existing policies on these tables FIRST, then alter
-- the type, then create the new Clerk-aware policies.
--
-- This script:
--   1. Drops every policy on public.transactions and public.categories.
--   2. Alters `user_id` from `uuid` to `text` in both tables.
--   3. Replaces the RLS policies with JWT-claim-based versions that work
--      with Clerk's string user IDs.
--
-- IMPORTANT: Run this in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop ALL existing policies on transactions and categories
--    (Postgres blocks ALTER TYPE while any policy depends on the column)
-- ---------------------------------------------------------------------------
do $$
declare
	pol record;
begin
	for pol in
		select policyname, tablename
		  from pg_policies
		 where schemaname = 'public'
		   and tablename in ('transactions', 'categories')
	loop
		execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
		raise notice 'Dropped policy "%" on public.%', pol.policyname, pol.tablename;
	end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. transactions.user_id : uuid → text
-- ---------------------------------------------------------------------------
do $$
begin
	if exists (
		select 1 from information_schema.columns
		where table_schema = 'public'
		  and table_name = 'transactions'
		  and column_name = 'user_id'
		  and data_type = 'uuid'
	) then
		alter table public.transactions
			alter column user_id type text using user_id::text;
		raise notice 'Altered public.transactions.user_id: uuid → text';
	else
		raise notice 'public.transactions.user_id is already non-uuid, skipping';
	end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. categories.user_id : uuid → text
-- ---------------------------------------------------------------------------
do $$
begin
	if exists (
		select 1 from information_schema.columns
		where table_schema = 'public'
		  and table_name = 'categories'
		  and column_name = 'user_id'
		  and data_type = 'uuid'
	) then
		alter table public.categories
			alter column user_id type text using user_id::text;
		raise notice 'Altered public.categories.user_id: uuid → text';
	else
		raise notice 'public.categories.user_id is already non-uuid, skipping';
	end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Re-enable RLS (idempotent)
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.categories  enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Create Clerk-aware RLS policies (JWT sub claim)
--    See: https://clerk.com/docs/guides/development/integrations/databases/supabase
-- ---------------------------------------------------------------------------
create policy "Users manage their own transactions"
	on public.transactions
	for all
	to authenticated
	using      ((select auth.jwt()->>'sub') = user_id)
	with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users manage their own categories"
	on public.categories
	for all
	to authenticated
	using      ((select auth.jwt()->>'sub') = user_id)
	with check ((select auth.jwt()->>'sub') = user_id);

-- ---------------------------------------------------------------------------
-- Verify (run manually to confirm)
-- ---------------------------------------------------------------------------
-- select table_name, column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name in ('transactions', 'categories')
--    and column_name = 'user_id';
-- Expected: data_type = 'text' for both rows.
--
-- select policyname, cmd, qual
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('transactions', 'categories');
-- Expected: 2 policies, qual contains 'auth.jwt' (not 'auth.uid').
-- ============================================================================
