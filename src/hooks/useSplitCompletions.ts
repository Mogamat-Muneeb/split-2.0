// hooks/useSplitCompletions.ts
import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { SplitDayCompletion } from '@/lib/types';

export const useSplitCompletions = (splitId: string | null) => {
  const [completions, setCompletions] = useState<SplitDayCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompletions = async () => {
    if (!splitId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('split_day_completions')
        .select('*')
        .eq('split_id', splitId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error('Error fetching split completions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markDayAsCompleted = async (
    splitDayId: string,
    workoutSessionId: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('split_day_completions')
        .insert({
          split_id: splitId,
          split_day_id: splitDayId,
          workout_session_id: workoutSessionId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setCompletions(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error marking day as completed:', error);
      throw error;
    }
  };

  const isDayCompletedToday = (splitDayId: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return completions.some(completion => 
      completion.split_day_id === splitDayId && 
      completion.completed_at.split('T')[0] === today
    );
  };

  const getCompletionForDay = (splitDayId: string): SplitDayCompletion | undefined => {
    const today = new Date().toISOString().split('T')[0];
    return completions.find(completion => 
      completion.split_day_id === splitDayId && 
      completion.completed_at.split('T')[0] === today
    );
  };

  useEffect(() => {
    fetchCompletions();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('split-day-completions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'split_day_completions'
        },
        () => {
          fetchCompletions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [splitId]);

  return {
    completions,
    isLoading,
    markDayAsCompleted,
    isDayCompletedToday,
    getCompletionForDay,
    refetch: fetchCompletions
  };
};