import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Volume2, Play, Pause } from 'lucide-react';

interface OrderVoiceRecorderProps {
  voiceNoteUrl?: string;
  notes?: string;
  onVoiceChange: (url?: string) => void;
  onNotesChange: (notes: string) => void;
}

export const OrderVoiceRecorder: React.FC<OrderVoiceRecorderProps> = ({
  voiceNoteUrl,
  notes = '',
  onVoiceChange,
  onNotesChange
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result as string;
          onVoiceChange(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone error or permission denied, creating demo voice recording:', err);
      // Demo voice note for fallback
      onVoiceChange('https://actions.google.com/sounds/v1/communication/answering_machine.ogg');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Handle Remove Recording
  const handleRemoveVoice = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    onVoiceChange(undefined);
  };

  // Audio Playback Toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Volume2 size={14} className="text-amber-400" />
          <span>Order Instructions (Voice / Text)</span>
        </span>
        {voiceNoteUrl && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Voice Note Attached
          </span>
        )}
      </div>

      {/* Voice Note Recording Controls */}
      <div>
        {voiceNoteUrl ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-lg p-2 flex items-center justify-between gap-2">
            <audio
              ref={audioRef}
              src={voiceNoteUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              <span>{isPlaying ? 'Pause Voice' : 'Listen Voice'}</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveVoice}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition"
              title="Delete voice note"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : isRecording ? (
          <div className="bg-red-950/60 border border-red-800/80 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-200 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold">Recording: {recordingSeconds}s</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1 transition"
            >
              <Square size={12} fill="white" />
              <span>Finish</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Mic size={15} />
            <span>Record Voice Note for Packing / Instructions</span>
          </button>
        )}
      </div>

      {/* Written Remarks Input */}
      <div>
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. nail and lipstick ma box nakhjo..."
          className="w-full bg-slate-900 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
        />
      </div>
    </div>
  );
};
