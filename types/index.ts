export type UserLevel = 'beginner' | 'intermediate' | 'advanced';
export type UserGender = 'male' | 'female';
export type CommunityRole = 'owner' | 'sub_admin' | 'member';
export type MatchLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type MatchGenderType = 'open' | 'male' | 'female' | 'mixed';
export type MatchStatus = 'recruiting' | 'full' | 'cancelled' | 'completed';
export type ApplicationStatus = 'pending' | 'confirmed' | 'waiting_pool' | 'cancelled';
export type PaymentStatus = 'not_required' | 'pending' | 'sent' | 'confirmed';

export interface Profile {
  id: string;
  username: string;
  phone: string | null;
  level: UserLevel;
  gender: UserGender;
  kakao_pay_link: string | null;
  host_temperature: number;
  participant_temperature: number;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  created_at: string;
  member_count?: number;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  joined_at: string;
  profile?: Profile;
  community?: Community;
}

export interface Match {
  id: string;
  community_id: string;
  host_id: string;
  title: string;
  venue: string;
  match_date: string;
  match_time: string;
  total_cost: number;
  max_players: number;
  confirmed_players: number;
  cost_per_player: number;
  level: MatchLevel;
  gender_type: MatchGenderType;
  status: MatchStatus;
  notes: string | null;
  created_at: string;
  host?: Profile;
  community?: Community;
  user_application?: MatchApplication | null;
}

export interface MatchApplication {
  id: string;
  match_id: string;
  user_id: string;
  application_number: number;
  status: ApplicationStatus;
  payment_status: PaymentStatus;
  applied_at: string;
  confirmed_at: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  profile?: Profile;
  match?: Match;
}

export interface SubstituteRequest {
  id: string;
  match_id: string;
  requester_id: string;
  replacer_id: string | null;
  status: 'open' | 'filled' | 'cancelled';
  created_at: string;
  match?: Match;
  requester?: Profile;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  community_id: string | null;
  preferred_days: string[];
  preferred_time_ranges: string[];
  preferred_levels: string[];
  push_token: string | null;
  is_active: boolean;
}

export interface MatchFilterParams {
  days?: string[];
  timeRanges?: string[];
  levels?: MatchLevel[];
  genderTypes?: MatchGenderType[];
}

export type MyMatchTab = 'pending' | 'confirmed' | 'waiting_pool' | 'past';

// ─── Court Drop 기능 타입 ───────────────────────────────────────────────────

export type CourtStatus = '접수중' | '마감' | '안내중';

export interface CourtSlot {
  id: string;
  svc_id: string;
  court_name: string;
  place_name: string;
  area: string;
  start_dt: string | null;
  end_dt: string | null;
  status: CourtStatus;
  svc_url: string | null;
  last_checked_at: string;
  created_at: string;
}

export interface CourtAlertSubscription {
  id: string;
  user_id: string;
  area: string[] | null;
  court_keywords: string[] | null;
  days_of_week: number[] | null;  // 0=일, 1=월, ..., 6=토
  time_start: string | null;      // "HH:mm"
  time_end: string | null;        // "HH:mm"
  is_active: boolean;
  created_at: string;
}

export interface CourtAlertLog {
  id: string;
  user_id: string;
  svc_id: string;
  sent_at: string;
}
