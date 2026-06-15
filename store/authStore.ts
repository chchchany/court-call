import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, CommunityMember } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  memberships: CommunityMember[];
  activeCommunityId: string | null;
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setMemberships: (memberships: CommunityMember[]) => void;
  setActiveCommunity: (id: string | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  fetchMemberships: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  activeCommunityId: null,
  isLoading: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setMemberships: (memberships) => set({ memberships }),
  setActiveCommunity: (id) => set({ activeCommunityId: id }),

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  fetchMemberships: async (userId) => {
    const { data, error } = await supabase
      .from('community_members')
      .select('*, community:communities(*)')
      .eq('user_id', userId);

    if (!error && data) {
      const memberships = data as CommunityMember[];
      set({ memberships });
      if (memberships.length > 0 && !get().activeCommunityId) {
        set({ activeCommunityId: memberships[0].community_id });
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, memberships: [], activeCommunityId: null });
  },

  reset: () =>
    set({ session: null, profile: null, memberships: [], activeCommunityId: null }),
}));
