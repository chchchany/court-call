import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Expo from "https://esm.sh/expo-server-sdk@3.7.0";

const SEOUL_API_KEY = Deno.env.get("SEOUL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const expo = new Expo();

interface SeoulCourtRow {
  SVCID: string;
  SVCNM: string;
  PLACENM: string;
  AREANM: string;
  SVCOPNBGNDT: string;
  SVCOPNENDDT: string;
  REVSTATUS: string;
  SVCURL: string;
}

serve(async () => {
  try {
    // 1. 서울시 API에서 테니스장 현황 가져오기 (최대 500개)
    const apiUrl = `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/json/ListPublicReservationSport/1/500/테니스`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      throw new Error(`Seoul API error: ${res.status}`);
    }

    const data = await res.json();
    const rows: SeoulCourtRow[] = data.ListPublicReservationSport?.row ?? [];

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, count: 0, message: "No rows returned" }));
    }

    let alertsSent = 0;
    const newlyAvailable: SeoulCourtRow[] = [];

    for (const row of rows) {
      const svcId = row.SVCID;
      const newStatus = row.REVSTATUS;

      // 2. 이전 상태와 비교
      const { data: existing } = await supabase
        .from("court_slots")
        .select("status")
        .eq("svc_id", svcId)
        .maybeSingle();

      const wasUnavailable = !existing || existing.status !== "접수중";
      const isNowAvailable = newStatus === "접수중";

      // 3. DB upsert
      await supabase.from("court_slots").upsert({
        svc_id: svcId,
        court_name: row.SVCNM,
        place_name: row.PLACENM,
        area: row.AREANM,
        start_dt: row.SVCOPNBGNDT,
        end_dt: row.SVCOPNENDDT,
        status: newStatus,
        svc_url: row.SVCURL,
        last_checked_at: new Date().toISOString(),
      });

      // 4. 새로 취소 자리가 생긴 경우 알림 대상으로 등록
      if (wasUnavailable && isNowAvailable) {
        newlyAvailable.push(row);
      }
    }

    // 5. 취소 자리 생긴 코트들에 대해 알림 발송
    for (const court of newlyAvailable) {
      const sent = await sendAlerts(court);
      alertsSent += sent;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: rows.length,
        newlyAvailable: newlyAvailable.length,
        alertsSent,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("court-poller error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});

async function sendAlerts(court: SeoulCourtRow): Promise<number> {
  // 구독자 목록 조회 (활성 상태)
  const { data: subs, error } = await supabase
    .from("court_alert_subscriptions")
    .select("*, profiles(expo_push_token)")
    .eq("is_active", true);

  if (error || !subs) return 0;

  const courtDate = new Date(court.SVCOPNBGNDT);
  const dayOfWeek = courtDate.getDay(); // 0=일, 6=토
  const timeStr = courtDate.toTimeString().slice(0, 5); // "09:00"

  const messages: Parameters<typeof expo.chunkPushNotifications>[0] = [];

  for (const sub of subs) {
    // 조건 매칭
    const areaMatch = !sub.area?.length || sub.area.includes(court.AREANM);
    const keywordMatch =
      !sub.court_keywords?.length ||
      sub.court_keywords.some(
        (kw: string) => court.SVCNM.includes(kw) || court.PLACENM.includes(kw)
      );
    const dayMatch =
      !sub.days_of_week?.length || sub.days_of_week.includes(dayOfWeek);
    const timeMatch =
      !sub.time_start ||
      (timeStr >= sub.time_start && timeStr <= (sub.time_end ?? "23:59"));

    if (!areaMatch || !keywordMatch || !dayMatch || !timeMatch) continue;

    // 중복 알림 방지
    const { data: alreadySent } = await supabase
      .from("court_alert_logs")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("svc_id", court.SVCID)
      .maybeSingle();

    if (alreadySent) continue;

    const token = sub.profiles?.expo_push_token;
    if (!token || !Expo.isExpoPushToken(token)) continue;

    const dateLabel = courtDate.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });

    messages.push({
      to: token,
      title: "코트 취소 자리 났어요!",
      body: `${court.SVCNM} · ${dateLabel} ${timeStr}`,
      data: { svcUrl: court.SVCURL, svcId: court.SVCID },
      sound: "default",
    });

    // 발송 이력 기록
    await supabase.from("court_alert_logs").insert({
      user_id: sub.user_id,
      svc_id: court.SVCID,
    });
  }

  if (messages.length === 0) return 0;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Push send error:", err);
    }
  }

  console.log(`알림 발송: ${messages.length}건 (코트: ${court.SVCNM})`);
  return messages.length;
}
