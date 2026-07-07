-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the weekly report job to run every Monday at 8:00 AM
-- The body is empty because the edge function has been modified to process all patients when no specific IDs are provided.
SELECT cron.schedule(
  'weekly-report-job',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
      url:='https://vqqyijhuwupputyoyros.supabase.co/functions/v1/weekly-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcXlpamh1d3VwcHV0eW95cm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTgwMzUsImV4cCI6MjA5NDI3NDAzNX0.Xe219Fv-GJ0NjMtZgWVRJaFu8jOY_y-qHBExduu1lAo"}'::jsonb,
      body:='{}'::jsonb
  );
  $$
);
