-- pg_cron + pg_net으로 ycs-poller 5분마다 실행
-- Supabase 대시보드 → Database → Extensions에서 pg_cron, pg_net 활성화 필요

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 잡 제거 후 재등록
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ycs-poller-cron') THEN
    PERFORM cron.unschedule('ycs-poller-cron');
  END IF;
END $$;

SELECT cron.schedule(
  'ycs-poller-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tfjvprrueorrgaetdpwh.supabase.co/functions/v1/ycs-poller',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
