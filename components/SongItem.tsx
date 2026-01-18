'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useUser } from '@/hooks/useUser';
import { graphqlRequest, mutations } from '@/lib/graphql';
import { BsPlayFill, BsPauseFill } from 'react-icons/bs';
import { HiHeart, HiOutlineHeart } from 'react-icons/hi';
import toast from 'react-hot-toast';
import S3Image from './S3Image';
import type { Song } from '@/store/usePlayerStore';

interface SongItemProps {
  song: Song;
  onClick?: () => void;
  showLike?: boolean;
}

const SongItem = ({ song, onClick, showLike = true }: SongItemProps) => {
  const { user } = useUser();
  const { activeSong, isPlaying, setActiveSong, setIsPlaying } = usePlayerStore();
  const [isLiked, setIsLiked] = useState(false);
  const isActive = activeSong?.id === song.id;

  const handleClick = () => {
    if (isActive) {
      setIsPlaying(!isPlaying);
    } else {
      setActiveSong(song);
      setIsPlaying(true);
    }
    onClick?.();
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to like songs');
      return;
    }

    try {
      if (isLiked) {
        await graphqlRequest(mutations.unlikeSong, { songId: song.id });
        setIsLiked(false);
        toast.success('Removed from liked songs');
      } else {
        await graphqlRequest(mutations.likeSong, { songId: song.id });
        setIsLiked(true);
        toast.success('Added to liked songs');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update like');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="
        relative 
        group 
        flex 
        items-center 
        gap-x-4 
        cursor-pointer 
        hover:bg-neutral-800/50 
        w-full 
        p-2 
        rounded-md
      "
    >
      <div className="relative min-h-[48px] min-w-[48px] overflow-hidden rounded-md">
        <S3Image
          src={song.imagePath || '/placeholder.png'}
          alt={song.title}
          className="object-cover w-full h-full"
        />
        <div
          className="
            absolute 
            inset-0 
            bg-black 
            bg-opacity-0 
            group-hover:bg-opacity-40 
            transition 
            flex 
            items-center 
            justify-center
          "
        >
          {isActive && isPlaying ? (
            <BsPauseFill className="text-white" size={20} />
          ) : (
            <BsPlayFill className="text-white translate-x-0.5" size={20} />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-y-1 overflow-hidden flex-1">
        <p className={`text-white truncate ${isActive ? 'text-green-500' : ''}`}>
          {song.title}
        </p>
        <p className="text-neutral-400 text-sm truncate">
          {song.author}
        </p>
      </div>
      {showLike && user && (
        <button
          onClick={handleLike}
          className="opacity-0 group-hover:opacity-100 transition text-neutral-400 hover:text-red-500"
        >
          {isLiked ? (
            <HiHeart size={24} className="text-red-500" />
          ) : (
            <HiOutlineHeart size={24} />
          )}
        </button>
      )}
    </div>
  );
};

export default SongItem;
