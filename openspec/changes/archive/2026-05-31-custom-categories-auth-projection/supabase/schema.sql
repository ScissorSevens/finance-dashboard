-- ============================================================================
-- Finance Dashboard — Supabase schema (Phase 3)
-- ============================================================================
-- This file is the canonical SQL setup for the Supabase project backing the
-- finance dashboard. It is NOT executed automatically; the developer must
-- run it once in the Supabase SQL editor (or via the Supabase CLI migrations
-- workflow) before any Supabase-backed repository is functional.
--
-- Auth strategy: Clerk issues JWTs; we configure a Clerk JWT template named
-- "supabase" (see https://clerk.com/docs/integrations/databases/supabase)
-- that copies the Clerk user.id into the `sub` claim so Supabase's
-- `auth.uid()` resolves to the Clerk user.id. Every row in `transactions`
-- and `categories` stores that same user.id in its `user_id` column, so
-- the RLS policies below match `user_id = auth.uid()` exactly.
-- ============================================================================

-- pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- IMPORTANT: Clerk's user.id is a string like "user_3EWGG9rtW9fiLwfl0KI9XkSOldk"
-- — NOT a UUID. Therefore `user_id` columns must be `text`, not `uuid`.
-- RLS uses `auth.jwt()->>'sub'` (the `sub` claim from Clerk's JWT template)
-- rather than `auth.uid()` (which returns a Supabase UUID, not the Clerk ID).
-- See: https://clerk.com/docs/guides/development/integrations/databases/supabase
-- ============================================================================

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
	id          uuid primary key default gen_random_uuid(),
	user_id     text not null,                      -- Clerk user.id (e.g. "user_3EWGG9rtW9fiLwfl0KI9XkSOldk")
	amount      numeric not null check (amount > 0),
	type        text not null check (type in ('income', 'expense')),
	category    text not null,
	description text not null,
	date        date not null,
	created_at  timestamptz not null default now(),
	updated_at  timestamptz not null default now()
);

create index if not exists transactions_user_id_idx
	on public.transactions (user_id);
create index if not exists transactions_user_date_idx
	on public.transactions (user_id, date desc);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
	id         uuid primary key default gen_random_uuid(),
	user_id    text not null,                       -- Clerk user.id (e.g. "user_3EWGG9rtW9fiLwfl0KI9XkSOldk")
	name       text not null,
	type       text not null check (type in ('income', 'expense')),
	color      text not null,
	icon       text,
	is_default boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, name, type)
);

create index if not exists categories_user_id_idx
	on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.categories  enable row level security;

-- Drop pre-existing policies (idempotent re-runs of this script).
drop policy if exists "Users manage their own transactions" on public.transactions;
drop policy if exists "Users manage their own categories"  on public.categories;

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
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
	before update on public.transactions
	for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
	before update on public.categories
	for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clerk JWT template configuration (one-time, in Clerk dashboard)
-- ---------------------------------------------------------------------------
-- 1. Visit https://dashboard.clerk.com → JWT Templates → New template
-- 2. Name: "supabase"
-- 3. Template (Custom Claims):
--      { "sub": "{{user.id}}", "role": "authenticated" }
-- 4. Use the Signing Key from the template editor as SUPABASE_JWT_SECRET
--    in the Supabase project's API settings.
-- ---------------------------------------------------------------------------
