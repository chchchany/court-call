-- court_slots: 서울시 API에서 가져온 테니스장 슬롯 현황
CREATE TABLE IF NOT EXISTS court_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  svc_id TEXT UNIQUE NOT NULL,
  court_name TEXT NOT NULL,
  place_name TEXT NOT NULL,
  area TEXT NOT NULL,
  start_dt TIMESTAMPTZ,
  end_dt TIMESTAMPTZ,
  status TEXT NOT NULL,
  svc_url TEXT,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- court_alert_subscriptions: 사용자 코트 알림 구독 설정
CREATE TABLE IF NOT EXISTS court_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  area TEXT[],
  court_keywords TEXT[],
  days_of_week INT[],
  time_start TEXT,
  time_end TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- court_alert_logs: 알림 발송 이력 (중복 방지)
CREATE TABLE IF NOT EXISTS court_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  svc_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, svc_id)
);

-- RLS 정책
ALTER TABLE court_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_alert_logs ENABLE ROW LEVEL SECURITY;

-- court_slots: 누구나 읽기 가능, 서버(service role)만 쓰기
CREATE POLICY "court_slots_read" ON court_slots FOR SELECT USING (true);

-- court_alert_subscriptions: 본인 레코드만 접근
CREATE POLICY "subs_select_own" ON court_alert_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subs_insert_own" ON court_alert_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_update_own" ON court_alert_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subs_delete_own" ON court_alert_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- court_alert_logs: 본인 레코드만 읽기
CREATE POLICY "logs_select_own" ON court_alert_logs FOR SELECT USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_court_slots_status ON court_slots(status);
CREATE INDEX IF NOT EXISTS idx_court_slots_area ON court_slots(area);
CREATE INDEX IF NOT EXISTS idx_court_slots_start_dt ON court_slots(start_dt);
CREATE INDEX IF NOT EXISTS idx_subs_active ON court_alert_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_logs_user_svc ON court_alert_logs(user_id, svc_id);

