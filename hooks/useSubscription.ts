'use client';

import { useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';

export function useSubscription() {
  const { user, loading: userLoading } = useUser();
  const { isSubscribed, loading, refresh, error } = useSubscriptionStore();

  useEffect(() => {
    if (!userLoading) {
      refresh(user?.id ?? null, { force: false });
    }

    const onFocus = () => {
      // Re-check on tab focus; helpful right after Stripe redirects back.
      if (!userLoading) {
        refresh(user?.id ?? null, { force: false });
      }
    };

    // Listen for custom refresh event
    const onRefresh = () => {
      refresh(user?.id ?? null, { force: true });
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('subscription-refresh', onRefresh);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('subscription-refresh', onRefresh);
    };
  }, [user?.id, userLoading, refresh]);

  return {
    isSubscribed,
    loading: loading || userLoading,
    error,
    refreshSubscription: (opts?: { force?: boolean }) => refresh(user?.id ?? null, opts),
  };
}
