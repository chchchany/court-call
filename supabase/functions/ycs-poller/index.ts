// ycs-poller — 목동테니스장(ycs.or.kr) 빈자리 폴러
// company_code: YCS04 / part_code: 02 / place_code: 1~18
// use_yn === "Y" → 빈자리

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Expo } from "https://esm.sh/expo-server-sdk@3.7.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const expo = new Expo();

const BASE = "https://www.ycs.or.kr";
const COURTS = Array.from({ length: 18 }, (_, i) => String(i + 1));

// ycs.or.kr 인증서 발급 CA: TuringSign RSA Secure CA 2 (WISeKey)
// Deno 기본 번들에 없어서 직접 포함
const YCS_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIFjjCCBHagAwIBAgIQcCosoce0HIWpncOmISmyLzANBgkqhkiG9w0BAQsFADBt
MQswCQYDVQQGEwJDSDEQMA4GA1UEChMHV0lTZUtleTEiMCAGA1UECxMZT0lTVEUg
Rm91bmRhdGlvbiBFbmRvcnNlZDEoMCYGA1UEAxMfT0lTVEUgV0lTZUtleSBHbG9i
YWwgUm9vdCBHQiBDQTAeFw0yNTA1MjcxNTEwMzRaFw0zMDA1MjYxNTEwMzRaMFEx
CzAJBgNVBAYTAkNIMR0wGwYDVQQKDBRUdXJpbmdTaWduIEdsb2JhbCBTQTEjMCEG
A1UEAwwaVHVyaW5nU2lnbiBSU0EgU2VjdXJlIENBIDIwggIiMA0GCSqGSIb3DQEB
AQUAA4ICDwAwggIKAoICAQDGDBcFU6l+Hs5OUzBVjDQP8xGhdPG7xvNPu2Q5FF1f
L4IOIIYnx2E3ZFVbYf4a6d/8q4HFlWLT98BIPGo3nlsZiyaKb6MKMGONE5/4DfMk
zn+JkQaggOmXNLhn0hbezFJOJaYBcCroBZmDyOKbHRSHnBDZuG8Fx5UqbSG3Zlic
ywd4ET0CZXL/QZCcJzRJ6OMyndQpvmxbCq8TUwbqT4FwFDOwigqBPNlEgjSje0vc
3Xg7KUOgcHs9NI26Vo72YR/uiA9N/0gMfum0DLp/31vhIHw68LC/7cU/4Rp6yYaY
c8OfyhRuwfsMHWTXpAroHqbK8zlK4ZFOaTv+6MeFHnADyYRLdLl4cPTDmLUZFbyo
3Ec/NFepKYP/hFM0Fo7wFHMg1QsLSOD9KcQzxOkAhggX5bHd3DvQZyo3g3EnC6l0
FFQ4UwTI2qLKXpVN8EUfh3HSJmbVsQoyUdmbOz+qjtIjHAP2mIwip6AvE3DWA28E
K09fLTCbCbP/NBAfZAWbfzSeombpwib5pLUQ6/0FzMRw8dE6jm5t5L5INBXaUUCx
wXM9BJxMc+gqjxRJD5SEbyK0dFR74n2nkzzUS83GyFJXkfYDOnYBUN0kGtUzn4bt
RLdQ00+xewgFVMPGXTeQMK0VpavOb0uFcu4ZhLA28B2iT8XWc4Not1Bj84+5O50K
EwIDAQABo4IBRDCCAUAwEgYDVR0TAQH/BAgwBgEB/wIBADAfBgNVHSMEGDAWgBQ1
D8g2Y17io+z5O2YVzlFS45GaPTBrBggrBgEFBQcBAQRfMF0wNgYIKwYBBQUHMAKG
Kmh0dHA6Ly9wdWJsaWMud2lzZWtleS5jb20vY3J0L293Z3JnYmNhLmNlcjAjBggr
BgEFBQcwAYYXaHR0cDovL29jc3Aud2lzZWtleS5jb20wEQYDVR0gBAowCDAGBgRV
HSAAMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcDATA7BgNVHR8ENDAyMDCg
LqAshipodHRwOi8vcHVibGljLndpc2VrZXkuY29tL2NybC9vd2dyZ2JjYS5jcmww
HQYDVR0OBBYEFM3OdTxWi2FRu9+xUPmb6hymFzMRMA4GA1UdDwEB/wQEAwIBBjAN
BgkqhkiG9w0BAQsFAAOCAQEAbjvOB6/tTaX0YG/8sPytIvU6nEWuq2Zfxl7FMMB7
wAm7IPPf5MSTXcc8mmPh97YDj/A6N3jOf09G7IJEGYo7Sf9948ZhL6czKmByyKhU
r3yCEmVV/+MyhTvhc5aJIG6dnADXw8C1lMwEt6gzMolsNyQ3gY6slPxZ2xUEcPZi
wm9veB9aR+QfcUl7UHQHpfC7EoeelSir7AfcvLdbseaqM5GeWlFWmsCH7SweFybv
Tjz94Rfsafz5fEL2EaApecOUK3bLh9mO6cgL7n8yryrUKG5hY6D4OirSYpYJvS6y
u2wLYijDNYa2wMqRFdIoMB/7NxDyVQ3lfc7Kj50d33TUsQ==
-----END CERTIFICATE-----`;

const httpClient = Deno.createHttpClient({ caCerts: [YCS_CA_CERT] });

// ── 로그인 ───────────────────────────────────────────────
async function login(): Promise<{ cookie: string; memNo: string }> {
  const res = await fetch(`${BASE}/rest/member/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15",
      Referer: `${BASE}/fmcs/4`,
    },
    body: new URLSearchParams({
      id: Deno.env.get("YCS_ID")!,
      pw: Deno.env.get("YCS_PW")!,
    }),
    client: httpClient,
  } as any);

  const data = await res.json();
  const cookie = res.headers.get("set-cookie") ?? "";
  const memNo = String(data.mem_no ?? data.memNo ?? data.MEM_NO ?? "");

  if (!memNo) throw new Error("YCS 로그인 실패: mem_no 없음");
  console.log("YCS 로그인 성공 mem_no:", memNo);
  return { cookie, memNo };
}

// ── 코트·날짜별 시간대 조회 ──────────────────────────────
async function getTimeState(
  cookie: string,
  memNo: string,
  placeCode: string,
  date: string // "20260629"
): Promise<any[]> {
  const res = await fetch(`${BASE}/rest/facilities/place_time_state_list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookie,
      Referer: `${BASE}/yeyak/fmcs/43`,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15",
    },
    body: new URLSearchParams({
      company_code: "YCS04",
      part_code: "02",
      place_code: placeCode,
      base_date: date,
      rent_type: "1001",
      mem_no: memNo,
    }),
    client: httpClient,
  } as any);

  const data = await res.json();
  return Array.isArray(data) ? data : (data.list ?? []);
}

// ── 조회 날짜 생성 (오늘부터 30일, 토·일만) ──────────────
// KST(UTC+9) 기준으로 요일 판단 (서버는 UTC)
function getTargetDates(): string[] {
  const dates: string[] = [];
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const nowKST = new Date(Date.now() + KST_OFFSET);
  for (let i = 0; i < 30; i++) {
    const d = new Date(nowKST.getTime() + i * 24 * 60 * 60 * 1000);
    const dow = d.getUTCDay(); // nowKST 기준이므로 getUTCDay = KST 요일
    if ([0, 6].includes(dow)) {
      dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
    }
  }
  return dates;
}

// ── 메인 ────────────────────────────────────────────────
serve(async () => {
  try {
    const { cookie, memNo } = await login();
    const dates = getTargetDates();
    let newSlotCount = 0;

    for (const date of dates) {
      for (const court of COURTS) {
        let slots: any[];
        try {
          slots = await getTimeState(cookie, memNo, court, date);
        } catch (e) {
          console.error(`조회 실패 court=${court} date=${date}:`, e);
          continue;
        }

        for (const slot of slots) {
          const isAvailable = slot.use_yn === "Y";
          const svcId = `YCS04-${court}-${date}-${slot.time_no}`;

          // 이전 상태 확인
          const { data: prev } = await supabase
            .from("court_slots")
            .select("status")
            .eq("svc_id", svcId)
            .maybeSingle();

          // DB upsert (빈자리 여부 무관하게 항상 기록)
          await supabase.from("court_slots").upsert({
            svc_id: svcId,
            court_name: slot.place_nm,      // "코트-02"
            place_name: "목동 테니스장",
            area: "양천구",
            date: date,
            time: `${slot.start_time}~${slot.end_time}`,
            time_nm: slot.time_nm,          // "평일 2회"
            rent_amt: slot.rent_amt,        // 6400
            status: isAvailable ? "available" : "unavailable",
            svc_url: `${BASE}/yeyak/fmcs/43`,
            last_checked_at: new Date().toISOString(),
          });

          // 새로 빈자리가 된 경우에만 알림
          if (!isAvailable) continue;
          if (prev?.status === "available") continue;

          newSlotCount++;
          await sendAlerts(svcId, slot, date, court);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        newSlots: newSlotCount,
        courts: COURTS.length,
        dates: dates.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ycs-poller error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});

// ── 알림 발송 ────────────────────────────────────────────
async function sendAlerts(
  svcId: string,
  slot: any,
  date: string,
  court: string
): Promise<void> {
  const { data: subs } = await supabase
    .from("court_alert_subscriptions")
    .select("user_id, area, court_ids, days_of_week, time_start, time_end")
    .eq("is_active", true);

  if (!subs?.length) return;

  const d = new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  );
  const dow = d.getDay(); // 0=일, 6=토
  const dateStr = `${date.slice(4, 6)}/${date.slice(6, 8)}`;
  const dayStr = ["일", "월", "화", "수", "목", "금", "토"][dow];

  const messages: any[] = [];

  for (const sub of subs) {
    // 특정 코트 ID 필터 (선택된 코트가 있으면 해당 코트만, 없으면 전체)
    // court_ids 항목은 "YCS04-1" 형태 (place_code만), svcId는 "YCS04-1-20260629-1" 형태
    const courtKey = `YCS04-${court}`;
    const courtOk = !sub.court_ids?.length || sub.court_ids.includes(courtKey);
    // 지역 필터 (특정 코트가 없을 때만 의미있음)
    const areaOk = !sub.area?.length || sub.area.includes("양천구");
    // 요일 필터
    const dayOk = !sub.days_of_week?.length || sub.days_of_week.includes(dow);
    // 시간 필터
    const timeOk =
      !sub.time_start ||
      (slot.start_time >= sub.time_start &&
        slot.start_time <= (sub.time_end ?? "23:59"));

    if (!courtOk || !areaOk || !dayOk || !timeOk) continue;

    // 중복 발송 방지
    const { data: sent } = await supabase
      .from("court_alert_logs")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("svc_id", svcId)
      .maybeSingle();
    if (sent) continue;

    // 푸시 토큰 조회
    const { data: profile } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", sub.user_id)
      .maybeSingle();

    if (!profile?.expo_push_token) continue;
    if (!Expo.isExpoPushToken(profile.expo_push_token)) continue;

    messages.push({
      to: profile.expo_push_token,
      title: "🎾 목동 코트 빈자리 났어요!",
      body: `${slot.place_nm} · ${dateStr}(${dayStr}) ${slot.start_time}~${slot.end_time}`,
      data: {
        svcUrl: `${BASE}/yeyak/fmcs/43`,
        svcId,
        court,
        date,
        time: slot.start_time,
        rentAmt: slot.rent_amt,
      },
      sound: "default",
    });

    // 발송 이력 기록
    await supabase.from("court_alert_logs").insert({
      user_id: sub.user_id,
      svc_id: svcId,
    });
  }

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Push send error:", err);
    }
  }

  console.log(`알림 발송: ${messages.length}명 (${svcId})`);
}
