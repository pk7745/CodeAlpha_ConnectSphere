import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/socketService';
import { getChatMessagesApi, ChatMessage } from '../../services/collaborationApi';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

interface ChatPanelProps {
  meetingId: string;
  roomCode: string;
  currentUserId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  meetingId,
  roomCode,
  currentUserId,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadChatHistory() {
      if (!meetingId) return;
      try {
        setIsLoading(true);
        const history = await getChatMessagesApi(meetingId);
        if (isMounted) {
          setMessages(history);
        }
      } catch (err) {
        console.error('[Chat] Failed to load history:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadChatHistory();

    const socket = socketService.getSocket();

    const handleChatReceived = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('chat:received', handleChatReceived);

    return () => {
      isMounted = false;
      socket.off('chat:received', handleChatReceived);
    };
  }, [meetingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    const socket = socketService.getSocket();
    socket.emit('chat:send', {
      roomCode,
      content: trimmed,
    });

    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            <p className="text-xs">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-500">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-300">No messages yet</p>
            <p className="text-[11px] text-slate-500">Start the conversation with your team</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {isSelf ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm break-words leading-relaxed ${
                    isSelf
                      ? 'bg-brand-600 text-white rounded-tr-xs'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-xs'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 text-white transition-colors shadow-sm"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
