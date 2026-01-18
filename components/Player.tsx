'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { BsPauseFill, BsPlayFill } from 'react-icons/bs';
import { HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';
import { AiFillStepBackward, AiFillStepForward } from 'react-icons/ai';
import S3Image from './S3Image';

const Player = () => {
  const { 
    activeSong, 
    isPlaying, 
    volume, 
    setIsPlaying, 
    setVolume, 
    onPlayNext, 
    onPlayPrevious 
  } = usePlayerStore();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch presigned URL when activeSong changes
  useEffect(() => {
    const fetchPresignedUrl = async () => {
      if (!activeSong?.songPath) {
        setPresignedUrl(null);
        return;
      }

      setLoadingUrl(true);
      try {
        const response = await fetch('/api/s3/presign-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: activeSong.songPath }),
        });

        if (!response.ok) {
          throw new Error('Failed to get presigned URL');
        }

        const { playUrl } = await response.json();
        setPresignedUrl(playUrl);
      } catch (error) {
        console.error('Error fetching presigned URL:', error);
        // Fallback to direct URL if presigned URL fails
        setPresignedUrl(activeSong.songPath);
      } finally {
        setLoadingUrl(false);
      }
    };

    fetchPresignedUrl();
  }, [activeSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && presignedUrl) {
      // Update audio source when presigned URL is ready
      audioRef.current.src = presignedUrl;
      
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, presignedUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      onPlayNext();
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [activeSong, setIsPlaying, onPlayNext]);

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (volume === 0) {
      setVolume(1);
    } else {
      setVolume(0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  if (!activeSong) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 bg-black w-full py-2 h-[80px] px-4 z-50">
      <audio ref={audioRef} src={presignedUrl || undefined} />
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center w-[30%]">
          <div className="relative w-16 h-16 rounded-md overflow-hidden mr-4">
            <S3Image
              src={activeSong.imagePath || '/placeholder.png'}
              alt={activeSong.title}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex flex-col">
            <p className="text-white text-sm font-medium truncate max-w-[200px]">
              {activeSong.title}
            </p>
            <p className="text-gray-400 text-xs truncate max-w-[200px]">
              {activeSong.author}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center w-[40%]">
          <div className="flex items-center gap-4">
            <AiFillStepBackward
              onClick={onPlayPrevious}
              size={30}
              className="text-neutral-400 cursor-pointer hover:text-white transition"
            />
            <div
              onClick={handlePlay}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white p-1 cursor-pointer hover:scale-110 transition"
            >
              {isPlaying ? (
                <BsPauseFill size={30} className="text-black" />
              ) : (
                <BsPlayFill size={30} className="text-black pl-1" />
              )}
            </div>
            <AiFillStepForward
              onClick={onPlayNext}
              size={30}
              className="text-neutral-400 cursor-pointer hover:text-white transition"
            />
          </div>
          <div className="flex items-center gap-2 w-full mt-2">
            <span className="text-xs text-gray-400 w-10">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end w-[30%] gap-2">
          <div
            onClick={toggleMute}
            className="cursor-pointer hover:opacity-75 transition"
          >
            {volume === 0 ? (
              <HiSpeakerXMark size={34} className="text-white" />
            ) : (
              <HiSpeakerWave size={34} className="text-white" />
            )}
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default Player;
