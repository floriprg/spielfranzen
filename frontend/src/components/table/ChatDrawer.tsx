import { ChatMessage } from '@spielfranzen/shared';
import { Lock, MessageSquare, Send, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  chatEnabled?: boolean;
  currentUserId?: string;
  mySeatIndex?: number | null;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  chatEnabled = true,
  currentUserId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatEnabled || !inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-sm sm:max-w-md h-full max-h-[620px] shadow-2xl flex flex-col overflow-hidden my-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-300 font-serif-vintage leading-tight">
                Tisch-Chat
              </h3>
              <p className="text-[10px] text-slate-400">
                {chatEnabled ? 'Nachrichten in Echtzeit' : 'Chat deaktiviert'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!chatEnabled && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/40">
                <Lock className="w-3 h-3" /> Deaktiviert
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Chat schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5 bg-slate-950/60 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-amber-400/80">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-300">Noch keine Nachrichten</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {chatEnabled
                  ? "Schreibe die erste Nachricht an deine Mitspieler am Tisch! 👋"
                  : 'Der Host hat den Chat für dieses Spiel ausgeschaltet.'}
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = currentUserId && m.senderId === currentUserId;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-1.5 px-1 mb-0.5 text-[10px]">
                    <span
                      className={`font-bold ${
                        isMe ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {isMe ? 'Du' : m.senderName}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words shadow-sm ${
                      isMe
                        ? 'bg-amber-600/25 border border-amber-500/50 text-amber-100 rounded-tr-xs'
                        : 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer Area */}
        <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex-shrink-0">
          {chatEnabled ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nachricht schreiben..."
                maxLength={300}
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                  inputText.trim()
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-md active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Nachricht senden"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Chat ist in diesem Spiel deaktiviert</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
