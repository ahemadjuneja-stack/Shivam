import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  title?: string;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, title = 'Voice Note', compact = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [url]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio playback error:', err);
        setHasError(true);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = Number(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (hasError) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-[11px]">
        <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
        <span className="truncate">Voice file unavailable</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div 
        onClick={togglePlay}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all ${
          isPlaying 
            ? 'bg-[#291e10] border border-[#d97706] text-[#fde68a] font-bold shadow-md shadow-[#d97706]/10' 
            : 'bg-[#1c1917] border border-[#d97706]/30 text-[#d97706] hover:bg-[#291e10]/80'
        }`}
        title={isPlaying ? 'Click to Pause Voice Note' : 'Click to Play Voice Note'}
      >
        <audio ref={audioRef} src={url} preload="metadata" />
        {isPlaying ? (
          <Pause size={11} className="fill-current animate-pulse text-[#fde68a]" />
        ) : (
          <Play size={11} className="fill-current text-[#d97706]" />
        )}
        <span className="text-[10px] font-mono font-bold tracking-tight">
          {isPlaying ? formatTime(currentTime) : (duration ? formatTime(duration) : 'Voice')}
        </span>
        {isPlaying ? (
          <div className="flex items-center gap-0.5 ml-0.5">
            <span className="w-0.5 h-2.5 bg-[#fde68a] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-0.5 h-3.5 bg-[#fde68a] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-0.5 h-2 bg-[#fde68a] rounded-full animate-bounce" />
          </div>
        ) : (
          <div className="flex items-center gap-0.5 ml-0.5 opacity-60">
            <span className="w-0.5 h-2 bg-[#d97706]/50 rounded-full" />
            <span className="w-0.5 h-3 bg-[#d97706]/50 rounded-full" />
            <span className="w-0.5 h-1.5 bg-[#d97706]/50 rounded-full" />
          </div>
        )}
      </div>
    );
  }

  // Full Rich Player for Modals
  return (
    <div className="w-full bg-[#1c1917] border border-[#d97706]/30 rounded-xl p-3 shadow-inner">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#291e10] border border-[#d97706]/30 flex items-center justify-center text-[#d97706]">
            <Mic size={15} />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">{title}</span>
            <span className="text-[10px] text-[#d97706]/80 font-mono">Customer Voice Recording</span>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-[#fde68a]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#d97706] hover:bg-[#b45309] text-stone-950 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md shadow-[#d97706]/30"
        >
          {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#d97706]"
          />
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <Volume2 size={15} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
};
