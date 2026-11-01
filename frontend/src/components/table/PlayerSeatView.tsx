import { SanitizedPlayerSeat } from '@spielfranzen/shared';
import { Bot, Crown, Shield, Wifi, WifiOff } from 'lucide-react';
import React from 'react';
import { CardBack } from '../cards/CardBack.js';

interface PlayerSeatViewProps {
  player: SanitizedPlayerSeat;
  isCurrentTurn: boolean;
  isDealer: boolean;
  isMe: boolean;
  biddingText?: string;
  className?: string;
}

export const PlayerSeatView: React.FC<PlayerSeatViewProps> = ({
  player,
  isCurrentTurn,
  isDealer,
  isMe,
  biddingText,
  className = '',
}) => {
  return (
    <div
      className={`relative flex flex-col items-center p-3 rounded-xl backdrop-blur-md transition-all duration-300 ${
        isCurrentTurn
          ? 'bg-amber-950/60 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
          : 'bg-slate-900/70 border border-slate-700/60'
      } ${className}`}
    >
      {/* Dealer Badge */}
      {isDealer && (
        <span
          className="absolute -top-3 -left-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-yellow-300"
          title="Geber"
        >
          GEBER
        </span>
      )}

      {/* Role Badge */}
      {player.role === 'DECLARER' && (
        <span className="absolute -top-3 right-0 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
          <Crown className="w-3 h-3 text-slate-950" /> Alleinspieler
        </span>
      )}
      {player.role === 'DEFENDER' && (
        <span className="absolute -top-3 right-0 flex items-center gap-1 bg-slate-700 text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md border border-slate-600">
          <Shield className="w-3 h-3 text-slate-300" /> Gegner
        </span>
      )}

      {/* Avatar & Online status */}
      <div className="relative mb-1">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
            isCurrentTurn
              ? 'border-amber-400 bg-amber-900 text-amber-100 shadow-md animate-pulse'
              : 'border-slate-600 bg-slate-800 text-slate-200'
          }`}
        >
          {player.isBot ? (
            <Bot className="w-6 h-6 text-amber-400" />
          ) : (
            player.username.slice(0, 2).toUpperCase()
          )}
        </div>

        {/* Connection status light */}
        <span
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
            player.isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'
          }`}
          title={player.isOnline ? 'Online' : 'Verbindung getrennt'}
        />
      </div>

      {/* Name and Info */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-sm text-slate-100 truncate max-w-[120px]">
            {player.username} {isMe && '(Du)'}
          </span>
        </div>

        {/* Online / Bot note */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
          {player.isOnline ? (
            <span className="flex items-center text-emerald-400 gap-0.5">
              <Wifi className="w-2.5 h-2.5" /> Online
            </span>
          ) : (
            <span className="flex items-center text-rose-400 gap-0.5">
              <WifiOff className="w-2.5 h-2.5" /> Offline
            </span>
          )}
          <span>•</span>
          <span
            className={`font-semibold ${
              player.score > 0
                ? 'text-emerald-400'
                : player.score < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {player.score > 0 ? `+${player.score}` : player.score} Pkt
          </span>
        </div>
      </div>

      {/* Bidding Speech Bubble if any */}
      {biddingText && (
        <div className="mt-1.5 px-2 py-0.5 bg-amber-950/80 border border-amber-500/40 rounded text-amber-200 text-xs font-medium text-center">
          {biddingText}
        </div>
      )}

      {/* Card Count for opponent */}
      {!isMe && (
        <div className="mt-2 flex items-center gap-1">
          <CardBack size="sm" className="w-6 h-9" />
          <span className="text-xs font-bold text-slate-300">{player.handCount} Karten</span>
        </div>
      )}
    </div>
  );
};
