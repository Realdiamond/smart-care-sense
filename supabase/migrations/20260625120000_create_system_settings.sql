-- =============================================================
-- SMART CARE SENSE — System Settings Table
-- Single-row global platform configuration (id = 1 always).
-- Only admin-role users can read or update.
-- =============================================================

create table if not exists public.system_settings (
  id                                integer  primary key default 1 check (id = 1),
  platform_name                     text     not null default 'HealthPulse',
  allow_patient_signup              boolean  not null default true,
  require_doctor_verification       boolean  not null default true,
  auto_weekly_reports               boolean  not null default true,
  emergency_alert_threshold_hr_high integer  not null default 120,
  emergency_alert_threshold_hr_low  integer  not null default 45,
  emergency_alert_threshold_spo2    integer  not null default 92,
  report_frequency_days             integer  not null default 7,
  max_patients_per_doctor           integer  not null default 50,
  maintenance_mode                  boolean  not null default false,
  updated_at                        timestamptz default now()
);

-- Seed the one and only row so the page always finds something to upsert into
insert into public.system_settings (id) values (1) on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- Row-Level Security — admin only
-- ─────────────────────────────────────────────────────────────
alter table public.system_settings enable row level security;

-- Helper: true when the calling user has role = 'admin'
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Admins can read the config
create policy "Admin can read system settings"
  on public.system_settings for select
  using (public.is_admin());

-- Admins can update the config (no insert / delete — single row, already seeded)
create policy "Admin can update system settings"
  on public.system_settings for update
  using (public.is_admin());
