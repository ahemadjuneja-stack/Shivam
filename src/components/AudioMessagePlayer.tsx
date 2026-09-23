import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioMessagePlayerProps {
  src: string;
  isMe: boolean;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({ src, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      const d = audio.duration;
      if (typeof d === 'number' && !isNaN(d) && d !== Infinity && d > 0) {
        setDuration(d);
      } else {
        // Chrome WebM fix for Infinity or NaN duration on recorded audio
        const onTimeUpdateDuration = () => {
          audio.removeEventListener('timeupdate', onTimeUpdateDuration);
          const detected = audio.duration;
          if (typeof detected === 'number' && !isNaN(detected) && detected !== Infinity && detected > 0) {
            setDuration(detected);
          }
          audio.currentTime = 0;
        };
        audio.addEventListener('timeupdate', onTimeUpdateDuration);
        audio.currentTime = 1e101;
      }
    };

    const onDurationChange = () => {
      const d = audio.duration;
      if (typeof d === 'number' && !isNaN(d) && d !== Infinity && d > 0) {
        setDuration(d);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1.5 min-w-[210px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause circular button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm ${
          isMe 
            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' 
            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
        }`}
      >
        {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} className="ml-0.5" fill="currentColor" />}
      </button>

      {/* Progress & Waveform Track */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="relative flex items-center h-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-400 bg-white/20 focus:outline-none"
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono leading-none">
          <span className={isMe ? 'text-slate-200' : 'text-slate-400'}>
            {isPlaying ? formatTime(currentTime) : (duration > 0 && duration !== Infinity ? formatTime(duration) : '0:00')}
          </span>
          
          <button
            type="button"
            onClick={togglePlaybackRate}
            className={`px-1 rounded text-[9px] font-bold tracking-wider transition ${
              isMe ? 'bg-black/30 text-amber-200 hover:bg-black/50' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>

      <Volume2 size={14} className={`flex-shrink-0 opacity-60 ${isMe ? 'text-amber-200' : 'text-slate-400'}`} />
    </div>
  );
};
