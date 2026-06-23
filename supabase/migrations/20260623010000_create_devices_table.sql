-- The live DB (multi_role schema) never created the `devices` table, but the
-- patient Devices page pairs watches into it and ingest-vitals authenticates
-- the bridge against it. Create it to match both call sites.
--
-- Columns used by app/(dashboard)/patient/devices/page.tsx:
--   name, device_type, connection_type, mac_address, api_key_hash,
--   api_key_prefix, last_seen_at, is_active, created_at
-- ingest-vitals looks the device up by api_key_hash (SHA-256 of the hp_ key).

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  device_type text not null default 'smartwatch',
  connection_type text not null check (connection_type in ('bluetooth', 'wifi', 'manual')),
  mac_address text,
  api_key_hash text,
  api_key_prefix text,
  last_seen_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;

-- A patient manages only their own devices.
drop policy if exists "own devices all" on public.devices;
create policy "own devices all" on public.devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fast lookup by hashed key for the ingest endpoint.
create index if not exists devices_api_key_hash_idx on public.devices (api_key_hash);
create index if not exists devices_user_idx on public.devices (user_id);
