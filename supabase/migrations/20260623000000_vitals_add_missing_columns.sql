-- The live vitals_readings table (from the multi_role migration) was created slim:
--   id, user_id, metric_type, value, unit, recorded_at
-- But ingest-vitals (the IoT/bridge endpoint) and the dashboard expect three more
-- columns. Add them idempotently so the full pipeline (bridge -> ingest -> dashboard)
-- works and blood-pressure diastolic can be stored.

-- NOTE: device_id is a plain uuid (no FK) because the live DB has no `devices`
-- table yet. The devices table + key-auth system is a later step for the bridge;
-- this keeps the column ready without blocking on it.
alter table public.vitals_readings
  add column if not exists value_secondary numeric,
  add column if not exists device_id uuid,
  add column if not exists metadata jsonb;
