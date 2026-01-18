'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { graphqlRequest, queries } from '@/lib/graphql';
import { usePlayerStore } from '@/store/usePlayerStore';
import SongItem from '@/components/SongItem';
import type { Song } from '@/store/usePlayerStore';

export default function LikedPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { songs, setSongs } = usePlayerStore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
      return;
    }

    const fetchLikedSongs = async () => {
      try {
        const data = await graphqlRequest<{ likedSongs: Song[] }>(queries.getLikedSongs);
        setSongs(data.likedSongs);
      } catch (error) {
        console.error('Error fetching liked songs:', error);
      }
    };

    if (user) {
      fetchLikedSongs();
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
    <div className="bg-gradient-to-b from-purple-900 to-black h-full p-8">
      <h1 className="text-white text-3xl font-bold mb-8">Liked Songs</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {songs.map((song) => (
          <SongItem key={song.id} song={song} />
        ))}
      </div>
      {songs.length === 0 && (
        <div className="text-white text-center mt-8">
          No liked songs yet. Start liking songs to see them here!
        </div>
      )}
    </div>
  );
}
