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
      className={`relative flex flex-col items-center p-3 rounded-2xl backdrop-blur-md transition-all duration-300 shadow-xl ${
        isCurrentTurn
          ? 'bg-gradient-to-b from-amber-950/70 to-slate-900/90 border-2 border-amber-400 shadow-amber-500/20 shadow-lg'
          : 'bg-slate-900/80 border border-slate-700/60'
      } ${className}`}
    >
      {/* Top Header Row inside the card (Clean, no floating overlaps) */}
      <div className="w-full flex items-center justify-between min-h-[22px] mb-2 px-0.5">
        {/* Dealer Badge */}
        {isDealer ? (
          <span
            className="bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-yellow-300 tracking-wider"
            title="Geber"
          >
            GEBER
          </span>
        ) : (
          <span className="w-1" />
        )}

        {/* Role Badge */}
        {player.role === 'DECLARER' && (
          <span className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            <Crown className="w-3 h-3 text-slate-950" /> Alleinspieler
          </span>
        )}
        {player.role === 'DEFENDER' && (
          <span className="flex items-center gap-1 bg-slate-800 text-slate-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm border border-slate-600">
            <Shield className="w-3 h-3 text-slate-400" /> Gegner
          </span>
        )}
      </div>

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
      <div className="text-center w-full">
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-sm text-slate-100 truncate max-w-[130px]">
            {player.username} {isMe && '(Du)'}
          </span>
        </div>

        {/* Online / Bot note & Score */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
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
        <div className="mt-2 px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/40 rounded-full text-amber-200 text-xs font-medium text-center shadow-sm">
          {biddingText}
        </div>
      )}

      {/* Card Count for opponent */}
      {!isMe && (
        <div className="mt-2 flex items-center gap-1.5">
          <CardBack size="sm" className="w-5 !aspect-[256/480]" />
          <span className="text-xs font-bold text-slate-300">{player.handCount} Karten</span>
        </div>
      )}

      {/* Turn Indicator Pill */}
      {isCurrentTurn && (
        <span className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] tracking-wider shadow-lg uppercase border border-yellow-300 animate-pulse">
          Am Zug
        </span>
      )}
    </div>
  );
};
