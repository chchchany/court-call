import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";

const AREAS = ["양천구", "영등포구", "강남구", "송파구", "마포구", "서대문구", "노원구", "강동구"];
const DAYS = [
  { label: "월", value: 1 },
  { label: "화", value: 2 },
  { label: "수", value: 3 },
  { label: "목", value: 4 },
  { label: "금", value: 5 },
  { label: "토", value: 6 },
  { label: "일", value: 0 },
];
const TIME_OPTIONS = ["06:00", "07:00", "08:00", "09:00", "10:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

export default function CourtAlertSetup() {
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState("07:00");
  const [timeEnd, setTimeEnd] = useState("22:00");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExisting();
  }, []);

  async function loadExisting() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("court_alert_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setSelectedAreas(data.area ?? []);
      setSelectedDays(data.days_of_week ?? []);
      setTimeStart(data.time_start ?? "07:00");
      setTimeEnd(data.time_end ?? "22:00");
      setIsActive(data.is_active ?? true);
    }
    setLoading(false);
  }

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("오류", "로그인이 필요합니다.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("court_alert_subscriptions").upsert({
      user_id: user.id,
      area: selectedAreas,
      days_of_week: selectedDays,
      time_start: timeStart,
      time_end: timeEnd,
      is_active: isActive,
    });

    setSaving(false);
    if (error) {
      Alert.alert("오류", "저장에 실패했습니다. 다시 시도해주세요.");
    } else {
      Alert.alert("완료", "코트 알림이 설정됐어요! 취소 자리가 나면 바로 알려드릴게요.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C8FF00" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코트 취소 알림 설정</Text>
      <Text style={styles.subtitle}>서울시 공공 테니스장 취소 자리를 실시간으로 알려드려요</Text>

      {/* 알림 ON/OFF */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>알림 받기</Text>
          <TouchableOpacity
            style={[styles.toggle, isActive && styles.toggleOn]}
            onPress={() => setIsActive((v) => !v)}
          >
            <Text style={[styles.toggleText, isActive && styles.toggleTextOn]}>
              {isActive ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 지역 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>원하는 지역 <Text style={styles.hint}>(미선택 시 전체)</Text></Text>
        <View style={styles.chipGroup}>
          {AREAS.map((area) => (
            <TouchableOpacity
              key={area}
              style={[styles.chip, selectedAreas.includes(area) && styles.chipSelected]}
              onPress={() => toggleArea(area)}
            >
              <Text style={[styles.chipText, selectedAreas.includes(area) && styles.chipTextSelected]}>
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 요일 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>원하는 요일 <Text style={styles.hint}>(미선택 시 전체)</Text></Text>
        <View style={styles.chipGroup}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[styles.dayChip, selectedDays.includes(day.value) && styles.chipSelected]}
              onPress={() => toggleDay(day.value)}
            >
              <Text style={[styles.chipText, selectedDays.includes(day.value) && styles.chipTextSelected]}>
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 시간대 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>원하는 시간대</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>시작</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipGroup}>
                {TIME_OPTIONS.filter((t) => t <= timeEnd).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, timeStart === t && styles.chipSelected]}
                    onPress={() => setTimeStart(t)}
                  >
                    <Text style={[styles.chipText, timeStart === t && styles.chipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>종료</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipGroup}>
                {TIME_OPTIONS.filter((t) => t >= timeStart).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, timeEnd === t && styles.chipSelected]}
                    onPress={() => setTimeEnd(t)}
                  >
                    <Text style={[styles.chipText, timeEnd === t && styles.chipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* 저장 버튼 */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#1A2E10" />
        ) : (
          <Text style={styles.saveBtnText}>알림 설정 저장</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  title: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#7A8FA6", marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginBottom: 12 },
  hint: { fontSize: 12, fontWeight: "400", color: "#7A8FA6" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#131D30",
    borderWidth: 1,
    borderColor: "#1E2D45",
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#131D30",
    borderWidth: 1,
    borderColor: "#1E2D45",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: "#1A3A0A", borderColor: "#C8FF00" },
  chipText: { color: "#7A8FA6", fontWeight: "600", fontSize: 13 },
  chipTextSelected: { color: "#C8FF00" },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#131D30",
    borderWidth: 1,
    borderColor: "#1E2D45",
  },
  toggleOn: { backgroundColor: "#1A3A0A", borderColor: "#C8FF00" },
  toggleText: { color: "#7A8FA6", fontWeight: "700", fontSize: 14 },
  toggleTextOn: { color: "#C8FF00" },
  timeRow: { gap: 16 },
  timeBlock: { gap: 8 },
  timeLabel: { fontSize: 13, color: "#7A8FA6", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#C8FF00",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#1A2E10", fontWeight: "800", fontSize: 16 },
});
