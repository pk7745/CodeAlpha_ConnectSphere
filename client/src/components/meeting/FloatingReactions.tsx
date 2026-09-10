import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';

interface ReactionBubble {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

export const FloatingReactions: React.FC = () => {
  const [reactions, setReactions] = useState<ReactionBubble[]>([]);

  useEffect(() => {
    const socket = socketService.getSocket();

    const handleReactionReceived = (data: {
      emoji: string;
      senderId: string;
      senderName: string;
    }) => {
      const newReaction: ReactionBubble = {
        id: `${Date.now()}-${Math.random()}`,
        emoji: data.emoji,
        senderName: data.senderName,
        leftPercent: 20 + Math.random() * 60, // 20% to 80% horizontal range
      };

      setReactions((prev) => [...prev, newReaction]);

      // Remove after 2.5s
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2500);
    };

    socket.on('reaction:received', handleReactionReceived);

    return () => {
      socket.off('reaction:received', handleReactionReceived);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-20 flex flex-col items-center animate-floatUp select-none"
          style={{ left: `${r.leftPercent}%` }}
        >
          <span className="text-3xl sm:text-4xl filter drop-shadow-lg transform transition-transform duration-300 hover:scale-125">
            {r.emoji}
          </span>
          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700/60 shadow mt-1 whitespace-nowrap">
            {r.senderName}
          </span>
        </div>
      ))}
    </div>
  );
};
