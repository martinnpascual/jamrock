-- Migration 002: Auto-expire REPROCANN vencidos vía pg_cron
-- Corre todos los días a las 00:00 UTC (21:00 ART)

-- Habilitar extensión pg_cron (requiere habilitarla en Supabase Dashboard:
--   Database → Extensions → pg_cron → Enable)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior si existe
SELECT cron.unschedule('auto-expire-reprocann')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-expire-reprocann'
);

-- Crear job diario
SELECT cron.schedule(
  'auto-expire-reprocann',
  '0 0 * * *',
  $$
  UPDATE public.members
  SET
    reprocann_status = 'vencido',
    updated_at = NOW()
  WHERE
    reprocann_expiry < CURRENT_DATE
    AND reprocann_status NOT IN ('vencido', 'cancelado')
    AND is_deleted = false;
  $$
);
