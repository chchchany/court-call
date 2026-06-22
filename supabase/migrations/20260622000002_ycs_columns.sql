-- YCS(목동테니스장) 슬롯을 위한 컬럼 추가
-- court_slots 테이블은 서울시 API와 YCS API가 공유함
-- 기존 start_dt/end_dt는 서울시 API용, 아래는 YCS용

ALTER TABLE court_slots
  ADD COLUMN IF NOT EXISTS date     TEXT,       -- "20260629"  (YCS)
  ADD COLUMN IF NOT EXISTS time     TEXT,       -- "10:00~11:00" (YCS)
  ADD COLUMN IF NOT EXISTS time_nm  TEXT,       -- "평일 2회" (YCS)
  ADD COLUMN IF NOT EXISTS rent_amt INTEGER;    -- 6400 (YCS)

-- YCS 슬롯 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_court_slots_date   ON court_slots(date);
CREATE INDEX IF NOT EXISTS idx_court_slots_source ON court_slots(area);

-- court_alert_subscriptions: 특정 코트 IDs 필터 추가
-- (미선택 시 NULL = 구독 지역 전체 대상)
ALTER TABLE court_alert_subscriptions
  ADD COLUMN IF NOT EXISTS court_ids TEXT[];    -- ["YCS04-1", "S001", ...] — null = 전체

CREATE INDEX IF NOT EXISTS idx_subs_court_ids ON court_alert_subscriptions USING GIN (court_ids);
