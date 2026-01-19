'use client';

import { create } from 'zustand';
import { graphqlRequest } from '@/lib/graphql';

type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | string;

interface SubscriptionStoreState {
  userId: string | null;
  isSubscribed: boolean;
  loading: boolean;
  lastCheckedAt: number | null;
  error: string | null;

  // actions
  reset: () => void;
  setOptimisticSubscribed: (value: boolean) => void;
  refresh: (nextUserId: string | null, options?: { force?: boolean }) => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionStoreState>((set, get) => ({
  userId: null,
  isSubscribed: false,
  loading: false,
  lastCheckedAt: null,
  error: null,

  reset: () =>
    set({
      userId: null,
      isSubscribed: false,
      loading: false,
      lastCheckedAt: null,
      error: null,
    }),

  setOptimisticSubscribed: (value) =>
    set({
      isSubscribed: value,
      // keep lastCheckedAt so we don't immediately refetch unless forced
    }),

  refresh: async (nextUserId, options) => {
    const { userId, lastCheckedAt, loading } = get();
    const force = options?.force === true;

    // Logged out -> definitely not subscribed.
    if (!nextUserId) {
      set({
        userId: null,
        isSubscribed: false,
        loading: false,
        lastCheckedAt: Date.now(),
        error: null,
      });
      return false;
    }

    // If user changed, reset cached value (avoid showing previous user's subscription).
    if (userId && userId !== nextUserId) {
      set({
        userId: nextUserId,
        isSubscribed: false,
        loading: false,
        lastCheckedAt: null,
        error: null,
      });
    } else if (!userId) {
      set({ userId: nextUserId });
    }

    // Avoid spamming requests: if checked in last 30s and not forced, reuse cache.
    if (!force && lastCheckedAt && Date.now() - lastCheckedAt < 30_000) {
      return get().isSubscribed;
    }

    // If there's already a refresh in-flight, don't start another.
    if (loading) {
      return get().isSubscribed;
    }

    set({ loading: true, error: null });
    try {
      const [userData, subscriptionData] = await Promise.all([
        graphqlRequest<{ user: { isSubscribed: boolean } | null }>(`query { user { isSubscribed } }`).catch(() => ({ user: null })),
        graphqlRequest<{ subscription: { status?: SubscriptionStatus } | null }>(
          `query { subscription { status } }`
        ).catch(() => ({ subscription: null })),
      ]);

      const status = subscriptionData.subscription?.status;
      const subscriptionActive = status === 'active' || status === 'trialing';
      const active = subscriptionActive || userData.user?.isSubscribed === true;

      set({
        userId: nextUserId,
        isSubscribed: active,
        loading: false,
        lastCheckedAt: Date.now(),
        error: null,
      });
      return active;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to refresh subscription';
      set({
        userId: nextUserId,
        isSubscribed: false,
        loading: false,
        lastCheckedAt: Date.now(),
        error: message,
      });
      return false;
    }
  },
}));

