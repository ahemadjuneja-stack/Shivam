import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { X, Send, Image as ImageIcon, Mic, Square, Volume2, ShieldCheck, Loader2, Download } from 'lucide-react';
import { ChatMessage } from '../types';
import { processGeminiCustomerChat } from '../services/geminiChatService';
import { uploadDashboardMedia } from '../services/storageService';

interface CustomerChatModalProps {
  onClose: () => void;
}

const isAudioUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(webm|mp3|ogg|m4a|wav)(\?|$)/i.test(url) || url.includes('voice') || url.startsWith('data:audio');
};

const isRawMediaUrl = (text?: string, mediaUrl?: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.startsWith('http') && trimmed.includes('firebasestorage')) return true;
  if (mediaUrl && trimmed === mediaUrl.trim()) return true;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  if (trimmed.includes(' ')) return false;
  return /\.(jpeg|jpg|png|webp|gif|webm|mp3|ogg|m4a|wav)(\?|$)/i.test(trimmed) ||
         ((trimmed.includes('firebasestorage.googleapis.com') || trimmed.includes('storage.googleapis.com')) &&
          /\.(jpeg|jpg|png|webp|gif|webm|mp3|ogg|m4a|wav)/i.test(trimmed));
};

const downloadImageToGallery = async (url: string, timestamp?: number) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `shivam_chat_${timestamp || Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Failed to download image:', err);
    window.open(url, '_blank');
  }
};

const compressImage = async (file: File, maxWidth: number = 1280, quality: number = 0.8): Promise<File | Blob> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export toDataURL('image/jpeg', 0.8) and convert to Blob
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const kb = Math.round(blob.size / 1024);
      console.log(`[DashImage] compressed to ${kb} KB`);

      const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "image";
      const compressedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
      resolve(compressedFile);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
};

export const CustomerChatModal: React.FC<CustomerChatModalProps> = ({ onClose }) => {
  const { currentCustomer, chatMessages, sendMessage } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Filter messages for current customer
  const customerMessages = currentCustomer
    ? chatMessages.filter(m => m.customerCode === currentCustomer.customerCode)
    : [];

  const isFirstRenderRef = useRef(true);
  const prevCustomerMsgCountRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFirstRenderRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isFirstRenderRef.current = false;
        prevCustomerMsgCountRef.current = customerMessages.length;
      } else if (customerMessages.length > prevCustomerMsgCountRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        prevCustomerMsgCountRef.current = customerMessages.length;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [customerMessages.length]);

  // Clean up timer/recorder on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!currentCustomer) {
    return (
      <div 
        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif' }}
      >
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center max-w-sm w-full space-y-4">
          <p className="text-white font-bold">Please select your Customer ID first to chat with SHIVAM.</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-brand-gold text-black font-black text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Send text message
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerCode: currentCustomer.customerCode,
      customerId: currentCustomer.customerCode,
      sender: 'CUSTOMER',
      type: 'TEXT',
      text: textToSend,
      content: textToSend,
      timestamp: Date.now(),
      isRead: false
    };

    sendMessage(newMsg);
    setInputText('');

    // Trigger Gemini API assistant response (fire-and-forget)
    try {
      processGeminiCustomerChat(textToSend, currentCustomer.customerCode).catch(err => {
        console.warn('Error triggering Gemini customer chat response:', err);
      });
    } catch (err) {
      console.warn('Error triggering Gemini customer chat response:', err);
    }
  };

  // Send image (compressed before upload: max 1280px, quality 0.8)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const compressed = await compressImage(file, 1280, 0.8);
      const cloudUrl = await uploadDashboardMedia(compressed, 'communication', currentCustomer.customerCode);
      const newMsg: ChatMessage = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customerCode: currentCustomer.customerCode,
        customerId: currentCustomer.customerCode,
        sender: 'CUSTOMER',
        type: 'IMAGE',
        text: '', // No raw URL in text
        content: '', // No raw URL in content
        mediaUrl: cloudUrl,
        imageUrl: cloudUrl,
        timestamp: Date.now(),
        isRead: false
      };
      sendMessage(newMsg);
    } catch (err) {
      console.error('Failed to upload image to Firebase Storage:', err);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  // Start voice recording
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const cloudUrl = await uploadDashboardMedia(audioBlob, 'communication', `voice_${currentCustomer.customerCode}`);
          const newMsg: ChatMessage = {
            id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            customerCode: currentCustomer.customerCode,
            customerId: currentCustomer.customerCode,
            sender: 'CUSTOMER',
            type: 'VOICE',
            text: '', // No raw URL in text
            content: '', // No raw URL in content
            mediaUrl: cloudUrl,
            voiceNoteUrl: cloudUrl,
            timestamp: Date.now(),
            isRead: false
          };
          sendMessage(newMsg);
        } catch (err) {
          console.error('Failed to upload voice note to Firebase Storage:', err);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access not available, generating demo audio note:', err);
      // Fallback demo voice note
      const newMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        customerCode: currentCustomer.customerCode,
        sender: 'CUSTOMER',
        type: 'VOICE',
        content: 'https://actions.google.com/sounds/v1/communication/answering_machine.ogg',
        timestamp: Date.now(),
        isRead: false
      };
      sendMessage(newMsg);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      style={{ fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md h-[88vh] max-h-[650px] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              HQ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-bold text-sm">SHIVAM</h3>
                <ShieldCheck size={14} className="text-emerald-400" />
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">Live Live Sync Connected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Customer Badge Banner */}
        <div className="bg-slate-800/60 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Shop: <strong className="text-white">{currentCustomer.shopName}</strong></span>
          <span className="font-mono text-amber-400 font-bold">ID: {currentCustomer.customerCode}</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080d1a]">
          {customerMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Volume2 className="mx-auto text-slate-600" size={32} />
              <p className="text-sm font-medium">No messages yet with SHIVAM.</p>
              <p className="text-xs text-slate-600">Send voice note or message regarding your orders & deliveries.</p>
            </div>
          ) : (
            customerMessages.map((msg) => {
              const isCustomer = msg.sender === 'CUSTOMER';
              const msgType = String(msg.type || 'TEXT').toUpperCase();

              const rawMedia = (msg as any).mediaUrl || '';
              const isAudioLike = isAudioUrl(rawMedia) || isAudioUrl((msg as any).audioUri || '') || isAudioUrl((msg as any).audioUrl || '') || isAudioUrl((msg as any).voiceNoteUrl || '');

              let img = (msg as any).imageUri || (msg as any).imageUrl || (msg as any).image || (!isAudioLike ? rawMedia : '') || (msgType === 'IMAGE' && !isAudioUrl(msg.content) ? msg.content : '') || '';
              let audio = (msg as any).audioUri || (msg as any).audioUrl || (msg as any).voiceNoteUrl || (isAudioLike ? rawMedia : '') || (msgType === 'VOICE' ? (rawMedia || msg.content) : '') || '';

              if (img && isAudioUrl(img)) {
                audio = audio || img;
                img = '';
              }

              const hasValidAudio = Boolean(audio && (isAudioUrl(audio) || msgType === 'VOICE'));
              const hasValidImg = Boolean(img && !isAudioUrl(img));

              return (
                <div key={msg.id} className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 shadow-md ${
                      isCustomer
                        ? 'bg-amber-500 text-black rounded-tr-sm font-medium'
                        : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                    }`}
                  >
                    {/* Header: Sender Label */}
                    <div className="text-[10px] opacity-70 font-bold mb-1">
                      {isCustomer ? 'You (App)' : 'SHIVAM'}
                    </div>

                    {/* Content */}
                    {hasValidImg ? (
                      <div className="relative group my-1 rounded-lg overflow-hidden border border-slate-700/60 bg-black/30">
                        <img src={img} alt="Attachment" className="max-w-full rounded-lg max-h-64 object-contain" />
                        <button
                          type="button"
                          onClick={() => downloadImageToGallery(img, msg.timestamp)}
                          title="Download image"
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white shadow-md backdrop-blur-sm transition-all flex items-center gap-1 text-[11px] font-medium border border-white/10"
                        >
                          <Download size={13} />
                          <span className="hidden sm:inline">Save</span>
                        </button>
                      </div>
                    ) : null}

                    {hasValidAudio ? (
                      <div className="space-y-1 my-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Volume2 size={14} />
                          <span>Voice Note</span>
                        </div>
                        <audio controls className="w-full max-w-[220px] h-8">
                          <source src={audio} />
                          Audio note
                        </audio>
                      </div>
                    ) : null}

                    {/* Text content (Never display raw Storage/Media URLs) */}
                    {(() => {
                      const candidate = (msg.text && !isRawMediaUrl(msg.text, rawMedia))
                        ? msg.text
                        : (msgType === 'TEXT' && msg.content && !hasValidImg && !hasValidAudio && !isRawMediaUrl(msg.content, rawMedia))
                          ? msg.content
                          : '';
                      const displayable = candidate.trim();
                      if (!displayable) return null;
                      return (
                        <p dir="ltr" className="text-xs sm:text-sm text-left whitespace-pre-wrap break-words">{displayable}</p>
                      );
                    })()}

                    {/* Time */}
                    <div className={`text-[10px] text-right mt-1 ${isCustomer ? 'text-black/70' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Audio Recording Banner */}
        {isRecording && (
          <div className="p-3 bg-red-950/90 border-t border-red-800 flex items-center justify-between text-red-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold">Recording Voice Note ({recordingSeconds}s)...</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1"
            >
              <Square size={12} fill="white" />
              <span>Send Voice</span>
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Image attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="p-2.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition"
              title="Attach Photo"
            >
              {isUploadingMedia ? <Loader2 size={18} className="animate-spin text-amber-400" /> : <ImageIcon size={18} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Voice record button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-full bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-black transition"
                title="Record Voice Note"
              >
                <Mic size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="p-2.5 rounded-full bg-red-500 text-white animate-pulse"
                title="Stop & Send Voice Note"
              >
                <Square size={18} fill="white" />
              </button>
            )}

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              dir="ltr"
              style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'plaintext' }}
              placeholder="Type message to SHIVAM..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white text-left focus:outline-none focus:border-amber-400"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
