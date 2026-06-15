import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, MatchFilterParams, MatchApplication, MyMatchTab } from '@/types';

export function useMatches(communityId: string | null, filters?: MatchFilterParams) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!communityId) return;
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('matches')
        .select(
          `
          *,
          host:profiles!matches_host_id_fkey(*),
          community:communities(*)
        `
        )
        .eq('community_id', communityId)
        .in('status', ['recruiting', 'full'])
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });

      if (filters?.levels && filters.levels.length > 0) {
        query = query.in('level', filters.levels);
      }
      if (filters?.genderTypes && filters.genderTypes.length > 0) {
        query = query.in('gender_type', filters.genderTypes);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data as Match[]) ?? [];

      if (filters?.days && filters.days.length > 0) {
        result = result.filter((m) => {
          const day = new Date(m.match_date).getDay().toString();
          return filters.days!.includes(day);
        });
      }

      setMatches(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [communityId, JSON.stringify(filters)]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matches, isLoading, error, refetch: fetchMatches };
}

export function useMatchDetail(matchId: string, userId?: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatch = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*, host:profiles!matches_host_id_fkey(*), community:communities(*)')
      .eq('id', matchId)
      .single();

    if (!error && data) {
      let matchData = data as Match;

      if (userId) {
        const { data: appData } = await supabase
          .from('match_applications')
          .select('*')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .maybeSingle();
        matchData = { ...matchData, user_application: appData as MatchApplication | null };
      }

      setMatch(matchData);
    }
    setIsLoading(false);
  }, [matchId, userId]);

  useEffect(() => {
    fetchMatch();

    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => fetchMatch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_applications', filter: `match_id=eq.${matchId}` },
        () => fetchMatch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatch]);

  return { match, isLoading, refetch: fetchMatch };
}

export function useMyMatches(userId: string | undefined, tab: MyMatchTab) {
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchMyMatches = async () => {
      setIsLoading(true);

      let statusFilter: string[];
      let matchStatusFilter: string[] | undefined;

      switch (tab) {
        case 'pending':
          statusFilter = ['pending'];
          break;
        case 'confirmed':
          statusFilter = ['confirmed'];
          break;
        case 'waiting_pool':
          statusFilter = ['waiting_pool'];
          break;
        case 'past':
          statusFilter = ['confirmed', 'cancelled'];
          matchStatusFilter = ['completed', 'cancelled'];
          break;
      }

      let query = supabase
        .from('match_applications')
        .select('*, match:matches(*, host:profiles!matches_host_id_fkey(*), community:communities(*))')
        .eq('user_id', userId)
        .in('status', statusFilter)
        .order('applied_at', { ascending: false });

      const { data } = await query;

      let result = (data as MatchApplication[]) ?? [];

      if (matchStatusFilter) {
        result = result.filter(
          (a) => a.match && matchStatusFilter!.includes((a.match as Match).status)
        );
      } else if (tab !== 'past') {
        result = result.filter(
          (a) => a.match && !['completed', 'cancelled'].includes((a.match as Match).status)
        );
      }

      setApplications(result);
      setIsLoading(false);
    };

    fetchMyMatches();
  }, [userId, tab]);

  return { applications, isLoading };
}

export function useHostApplications(matchId: string) {
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('match_applications')
      .select('*, profile:profiles(*)')
      .eq('match_id', matchId)
      .neq('status', 'cancelled')
      .order('application_number', { ascending: true });

    setApplications((data as MatchApplication[]) ?? []);
    setIsLoading(false);
  }, [matchId]);

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel(`applications-${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_applications', filter: `match_id=eq.${matchId}` },
        fetchApplications
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApplications]);

  return { applications, isLoading, refetch: fetchApplications };
}
