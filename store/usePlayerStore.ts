'use client';

import { create } from 'zustand';

export interface Song {
  id: string;
  userId: string;
  author: string;
  title: string;
  songPath: string;
  imagePath: string;
  createdAt?: string;
}

interface PlayerState {
  songs: Song[];
  activeSong: Song | null;
  isPlaying: boolean;
  volume: number;
  setSongs: (songs: Song[]) => void;
  setActiveSong: (song: Song | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  songs: [],
  activeSong: null,
  isPlaying: false,
  volume: 1,
  setSongs: (songs) => set({ songs }),
  setActiveSong: (song) => set({ activeSong: song }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  onPlayNext: () => {
    const { songs, activeSong } = get();
    if (!activeSong || songs.length === 0) return;
    
    const currentIndex = songs.findIndex((s) => s.id === activeSong.id);
    const nextIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
    set({ activeSong: songs[nextIndex] });
  },
  onPlayPrevious: () => {
    const { songs, activeSong } = get();
    if (!activeSong || songs.length === 0) return;
    
    const currentIndex = songs.findIndex((s) => s.id === activeSong.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    set({ activeSong: songs[prevIndex] });
  },
  reset: () => set({ songs: [], activeSong: null, isPlaying: false }),
}));
