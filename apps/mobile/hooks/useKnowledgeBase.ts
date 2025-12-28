import { useState, useEffect, useCallback } from 'react';
import { knowledgeBaseService } from '../services/knowledgeBase';
import type { KnowledgeCard, KBSearchOptions, KBStats } from '../services/knowledgeBase';

export function useKnowledgeBase(searchOptions: KBSearchOptions = {}) {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Serialize searchOptions for stable dependency tracking
  const searchOptionsKey = JSON.stringify(searchOptions);

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await knowledgeBaseService.search(searchOptions);
      setCards(result.cards);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch knowledge cards');
      console.error('Error fetching knowledge cards:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOptionsKey, refetchTrigger]);

  // Manual refetch function that forces a new fetch
  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    // PRODUCTION FIX: Check for auth before making API calls
    const checkAuthAndFetch = async () => {
      try {
        const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());

        if (session?.access_token) {
          fetchCards();
        } else {
          console.warn('⚠️ useKnowledgeBase: No session token, skipping fetch');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ useKnowledgeBase: Session check failed:', err);
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [fetchCards]);

  const createCard = async (card: Partial<KnowledgeCard>) => {
    try {
      const newCard = await knowledgeBaseService.createCard(card);
      await fetchCards(); // Refresh the list
      return newCard;
    } catch (err) {
      throw err;
    }
  };

  const updateCard = async (id: string, updates: Partial<KnowledgeCard>, reason?: string) => {
    try {
      const updatedCard = await knowledgeBaseService.updateCard(id, updates, reason);
      await fetchCards(); // Refresh the list
      return updatedCard;
    } catch (err) {
      throw err;
    }
  };

  const deleteCard = async (id: string) => {
    try {
      await knowledgeBaseService.deleteCard(id);
      await fetchCards(); // Refresh the list
    } catch (err) {
      throw err;
    }
  };

  return {
    cards,
    loading,
    error,
    total,
    refetch,
    createCard,
    updateCard,
    deleteCard
  };
}

export function useKnowledgeBaseStats() {
  const [stats, setStats] = useState<KBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchStats = async () => {
      try {
        const { data: { session } } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());

        if (!session?.access_token) {
          console.warn('⚠️ useKnowledgeBaseStats: No session token, skipping stats fetch');
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        const data = await knowledgeBaseService.getStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
        console.error('Error fetching KB stats:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchStats();
  }, []);

  return { stats, loading, error };
}

export function useKnowledgeCard(cardId: string | undefined, includeRelated = false) {
  const [card, setCard] = useState<KnowledgeCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      setCard(null);
      setLoading(false);
      return;
    }

    const fetchCard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await knowledgeBaseService.getCard(cardId, includeRelated);
        setCard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch card');
        console.error('Error fetching card:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [cardId, includeRelated]);

  return { card, loading, error };
}