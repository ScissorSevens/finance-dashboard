-- ============================================================================
-- Finance Dashboard — Schema FIX (v3: drops FK constraints first)
-- ============================================================================
-- Problem: The original schema declared `user_id` as `uuid`, but Clerk's
-- user.id is a string like "user_3EWGG9rtW9fiLwfl0KI9XkSOldk" — NOT a UUID.
-- Inserts from the app fail with:
--   "invalid input syntax for type uuid: 'user_3EWGG9rtW9fiLwfl0KI9XkSOldk'"
--
-- Postgres refuses to alter a column type while:
--   - an RLS policy depends on it
--     ("cannot alter type of a column used in a policy definition")
--   - a foreign key depends on it
--     ("foreign key constraint ... cannot be implemented")
--
-- For Clerk+Supabase we must:
--   1. Drop ALL existing policies on these tables.
--   2. Drop the FK from user_id → auth.users(id) (Clerk manages auth.users
--      externally, so the FK to Supabase's internal user table doesn't make
--      sense — and its uuid type blocks the alter).
--   3. Alter `user_id` from `uuid` to `text` in both tables.
--   4. Re-create the RLS policies with JWT-claim-based versions.
--
-- IMPORTANT: Run this in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop ALL existing policies on transactions and categories
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
-- 2. Drop ALL foreign keys on these tables that reference the user_id column
--    (The proposal.md suggested `user_id UUID REFERENCES auth.users(id)`,
--     but with Clerk managing auth, that FK must go — it blocks the type
--     change and adds no value.)
-- ---------------------------------------------------------------------------
do $$
declare
	c record;
begin
	for c in
		select conname, conrelid::regclass::text as tbl
		  from pg_constraint
		 where contype = 'f'
		   and connamespace = 'public'::regnamespace
		   and (
		   	   conrelid = 'public.transactions'::regclass
		   	or conrelid = 'public.categories'::regclass
		   )
		   and (
		   	   pg_get_constraintdef(oid) like '%user_id%'
		   	and pg_get_constraintdef(oid) like '%REFERENCES%'
		   )
	loop
		execute format('alter table %s drop constraint %I', c.tbl, c.conname);
		raise notice 'Dropped FK "%" on %', c.conname, c.tbl;
	end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. transactions.user_id : uuid → text
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
-- 4. categories.user_id : uuid → text
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
-- 5. Re-enable RLS (idempotent)
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.categories  enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Create Clerk-aware RLS policies (JWT sub claim)
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
