-- ============================================================================
-- Finance Dashboard — Schema FIX
-- ============================================================================
-- Problem: The original schema declared `user_id` as `uuid`, but Clerk's
-- user.id is a string like "user_3EWGG9rtW9fiLwfl0KI9XkSOldk" — NOT a UUID.
-- Inserts from the app fail with:
--   "invalid input syntax for type uuid: 'user_3EWGG9rtW9fiLwfl0KI9XkSOldk'"
--
-- Also: the original RLS used `user_id = auth.uid()`, but Clerk's user IDs
-- are strings, not UUIDs, so `auth.uid()` (which returns a Supabase UUID)
-- will never match. The correct approach is `auth.jwt()->>'sub' = user_id`,
-- which reads the `sub` claim (Clerk user.id) directly from the JWT.
--
-- See: https://clerk.com/docs/guides/development/integrations/databases/supabase
--      https://clerk.com/blog/how-clerk-integrates-with-supabase-auth
--
-- This script:
--   1. Alters `user_id` from `uuid` to `text` in both tables.
--   2. Replaces the RLS policies with JWT-claim-based versions.
--
-- IMPORTANT: Run this in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. transactions.user_id : uuid → text
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
	end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. categories.user_id : uuid → text
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
	end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Replace RLS policies with Clerk-aware JWT-claim-based versions
-- ---------------------------------------------------------------------------
-- Drop the old (broken) policies
drop policy if exists "Users manage their own transactions" on public.transactions;
drop policy if exists "Users manage their own categories"  on public.categories;

-- transactions: a user can only SELECT/INSERT/UPDATE/DELETE their own rows
create policy "Users manage their own transactions"
	on public.transactions
	for all
	to authenticated
	using      ((select auth.jwt()->>'sub') = user_id)
	with check ((select auth.jwt()->>'sub') = user_id);

-- categories: a user can only SELECT/INSERT/UPDATE/DELETE their own rows
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
-- Expected output: data_type = 'text' for both rows.
--
-- select policyname, cmd, qual
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('transactions', 'categories');
-- Expected: qual contains 'auth.jwt()->>sub' (not 'auth.uid').
-- ============================================================================
