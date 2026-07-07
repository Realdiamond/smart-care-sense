-- Enable pg_net for HTTP requests if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION check_abnormal_vitals()
RETURNS TRIGGER AS $$
DECLARE
  is_abnormal boolean := false;
  alert_msg text;
  url text := 'https://vqqyijhuwupputyoyros.supabase.co/functions/v1/emergency-notify';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcXlpamh1d3VwcHV0eW95cm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTgwMzUsImV4cCI6MjA5NDI3NDAzNX0.Xe219Fv-GJ0NjMtZgWVRJaFu8jOY_y-qHBExduu1lAo';
BEGIN
  -- Basic logic to check thresholds
  IF NEW.metric_type = 'heart_rate' THEN
    IF CAST(NEW.value AS numeric) > 100 THEN
      is_abnormal := true; alert_msg := 'High heart rate detected';
    ELSIF CAST(NEW.value AS numeric) < 50 THEN
      is_abnormal := true; alert_msg := 'Low heart rate detected';
    END IF;
  ELSIF NEW.metric_type = 'blood_oxygen' THEN
    IF CAST(NEW.value AS numeric) < 94 THEN
      is_abnormal := true; alert_msg := 'Low blood oxygen (SpO2) detected';
    END IF;
  ELSIF NEW.metric_type = 'blood_pressure_systolic' THEN
    IF CAST(NEW.value AS numeric) > 140 THEN
      is_abnormal := true; alert_msg := 'High systolic blood pressure detected';
    ELSIF CAST(NEW.value AS numeric) < 90 THEN
      is_abnormal := true; alert_msg := 'Low systolic blood pressure detected';
    END IF;
  ELSIF NEW.metric_type = 'temperature' THEN
    IF CAST(NEW.value AS numeric) > 37.5 THEN
      is_abnormal := true; alert_msg := 'High body temperature detected (Fever)';
    END IF;
  END IF;

  IF is_abnormal THEN
    PERFORM net.http_post(
      url := url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'patient_id', NEW.user_id,
        'metric_type', NEW.metric_type,
        'metric_value', NEW.value,
        'message', alert_msg
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently so we don't block the vital insertion if the network call fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vitals_anomaly_trigger ON vitals_readings;
CREATE TRIGGER vitals_anomaly_trigger
AFTER INSERT ON vitals_readings
FOR EACH ROW EXECUTE FUNCTION check_abnormal_vitals();
