import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { session, profile, memberships, activeCommunityId, fetchProfile, fetchMemberships } =
    useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      useAuthStore.getState().setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchMemberships(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchMemberships(session.user.id);
      } else {
        useAuthStore.getState().reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeMembership = memberships.find((m) => m.community_id === activeCommunityId);

  return {
    session,
    profile,
    memberships,
    activeCommunityId,
    activeMembership,
    isAuthenticated: !!session,
    isAdmin:
      activeMembership?.role === 'owner' || activeMembership?.role === 'sub_admin',
  };
}
