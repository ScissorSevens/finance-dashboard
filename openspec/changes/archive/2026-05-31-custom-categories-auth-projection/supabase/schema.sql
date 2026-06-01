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

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
	id          uuid primary key default gen_random_uuid(),
	user_id     uuid not null,                      -- Clerk user.id
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
	user_id    uuid not null,                       -- Clerk user.id
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
	using      (user_id = auth.uid())
	with check (user_id = auth.uid());

create policy "Users manage their own categories"
	on public.categories
	for all
	using      (user_id = auth.uid())
	with check (user_id = auth.uid());

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
