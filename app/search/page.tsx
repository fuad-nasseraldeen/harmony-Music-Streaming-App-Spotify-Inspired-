'use client';

import { useState, useEffect } from 'react';
import { graphqlRequest, queries } from '@/lib/graphql';
import { usePlayerStore } from '@/store/usePlayerStore';
import SongItem from '@/components/SongItem';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import type { Song } from '@/store/usePlayerStore';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchSongs = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await graphqlRequest<{ songsByTitle: Song[] }>(
          queries.searchSongs,
          { title: searchTerm }
        );
        setResults(data.songsByTitle);
      } catch (error) {
        console.error('Error searching songs:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchSongs, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  return (
    <div className="bg-gradient-to-b from-purple-900 to-black h-full p-8">
      <div className="mb-8">
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
          <input
            type="text"
            placeholder="Search for songs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {loading && (
        <div className="text-white text-center">Searching...</div>
      )}

      {!loading && searchTerm && results.length === 0 && (
        <div className="text-white text-center">No results found</div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {results.map((song) => (
            <SongItem key={song.id} song={song} />
          ))}
        </div>
      )}

      {!searchTerm && (
        <div className="text-white text-center text-lg">
          Start typing to search for songs...
        </div>
      )}
    </div>
  );
}
