import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Mic, Square } from 'lucide-react';
import { useAppStore } from '../store';

export function ChatModal({ isOpen, onClose, defaultCustomerCode = '' }: { isOpen: boolean, onClose: () => void, defaultCustomerCode?: string }) {
  const currentCustomer = useAppStore(state => state.currentCustomer);
  const messages = useAppStore(state => state.messages);
  const addMessage = useAppStore(state => state.addMessage);

  const isAdmin = !!defaultCustomerCode;
  const customerCode = isAdmin ? defaultCustomerCode : currentCustomer?.customerCode || '';

  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMessages = messages.filter(m => m.customerCode === customerCode);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  if (!isOpen) return null;

  const handleSendText = () => {
    if (!text.trim() || !customerCode) return;
    addMessage({
      id: Date.now().toString(),
      customerCode,
      sender: isAdmin ? 'admin' : 'customer',
      text: text.trim(),
      timestamp: Date.now()
    });
    setText('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && customerCode) {
      const reader = new FileReader();
      reader.onloadend = () => {
        addMessage({
          id: Date.now().toString(),
          customerCode,
          sender: isAdmin ? 'admin' : 'customer',
          imageUri: reader.result as string,
          timestamp: Date.now()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          if (customerCode) {
            addMessage({
              id: Date.now().toString(),
              customerCode,
              sender: isAdmin ? 'admin' : 'customer',
              audioUri: reader.result as string,
              timestamp: Date.now()
            });
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.message?.includes('sandboxed') || err.message?.includes('Permission denied')) {
        alert("Microphone access is blocked in this preview window. Please open the app in a new tab using the top-right button.");
      } else {
        alert("Microphone access is required to record voice notes.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 w-full max-w-md h-[80vh] rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 py-2 px-3 border-b border-slate-700 flex justify-between items-center">
          <div className="font-bold text-slate-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-black font-black text-[10px]">
              {isAdmin ? customerCode.slice(0, 2) : 'AD'}
            </div>
            <div className="leading-tight">
              <div className="text-xs">{isAdmin ? `Chat with ${customerCode}` : 'Support Chat'}</div>
              <div className="text-[10px] text-green-400 font-normal">Online</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-[#0a1120]">
          {chatMessages.length === 0 && (
            <div className="text-center text-slate-500 text-sm mt-10">
              No messages yet. Send a message to start communicating!
            </div>
          )}
          {chatMessages.map(msg => {
            const isMe = msg.sender === (isAdmin ? 'admin' : 'customer');
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] py-1.5 px-3 rounded-2xl shadow-sm ${isMe ? 'bg-brand-gold text-black rounded-tr-sm' : 'bg-slate-800 text-slate-100 rounded-tl-sm'}`}>
                  {msg.text && <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                  {msg.imageUri && <img src={msg.imageUri} alt="Uploaded" className="rounded-xl w-full object-cover mt-1 max-h-48" />}
                  {msg.audioUri && (
                    <audio controls src={msg.audioUri} className="mt-1 max-w-full h-7" />
                  )}
                  <span className={`text-[9px] block mt-0.5 ${isMe ? 'text-black/60' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-end gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-slate-700 text-slate-300 hover:text-brand-gold transition-colors flex-shrink-0"
          >
            <ImageIcon size={20} />
          </button>
          
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white resize-none h-[46px] max-h-32 focus:outline-none focus:border-brand-gold scrollbar-thin"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
          />

          {text.trim() ? (
            <button 
              onClick={handleSendText}
              className="p-3 rounded-xl bg-brand-gold text-black hover:bg-amber-400 transition-colors shadow-lg flex-shrink-0"
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-xl transition-colors shadow-lg flex-shrink-0 ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}
            >
              {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
