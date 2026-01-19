'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { graphqlRequest, queries } from '@/lib/graphql';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import SongItem from '@/components/SongItem';
import toast from 'react-hot-toast';
import type { Song } from '@/store/usePlayerStore';

export default function Home() {
  const router = useRouter();
  const setOptimisticSubscribed = useSubscriptionStore((s) => s.setOptimisticSubscribed);
  
  // Check for subscription success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');

    if (success === 'subscription' && sessionId) {
      // Save subscription to database immediately
      const saveSubscription = async () => {
        try {
          const response = await fetch('/api/checkout-success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();

          if (data.success) {
            toast.success('Subscription saved! Welcome to Premium!');
            // Optimistically unlock playback immediately (real refresh runs in background).
            setOptimisticSubscribed(true);
            // Trigger subscription refresh event
            window.dispatchEvent(new Event('subscription-refresh'));
            // Remove query params
            window.history.replaceState({}, '', '/');
            // Wait a bit for subscription to refresh, then redirect
            setTimeout(() => {
              router.push('/subscription');
            }, 1500);
          } else {
            console.error('Save subscription error:', data);
            throw new Error(data.error || data.details || 'Failed to save subscription');
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error saving subscription:', error);
          toast.error(`Failed to save: ${message}. Check console for details.`);
        }
      };

      saveSubscription();
    }
  }, [router, setOptimisticSubscribed]);
  const { user, loading } = useUser();
  const { songs, setSongs } = usePlayerStore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
      return;
    }

    const fetchSongs = async () => {
      try {
        const data = await graphqlRequest<{ songs: Song[] }>(queries.getSongs);
        setSongs(data.songs);
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };

    if (user) {
      fetchSongs();
    }
  }, [user, loading, router, setSongs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-purple-900 to-black h-full overflow-y-auto">
      <div className="p-8">
        <h1 className="text-white text-3xl font-bold mb-8">All Songs</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {songs.map((song) => (
            <SongItem key={song.id} song={song} />
          ))}
        </div>
        {songs.length === 0 && (
          <div className="text-white text-center mt-8">
            No songs available. Upload some music to get started!
          </div>
        )}
      </div>
    </div>
  );
}
