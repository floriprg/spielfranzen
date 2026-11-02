import { GameTimerState, SanitizedPlayerSeat } from '@spielfranzen/shared';
import { Bot, Clock, Crown, Shield, Wifi, WifiOff } from 'lucide-react';
import React from 'react';
import { CardBack } from '../cards/CardBack.js';
import { formatSecondsMMSS, useTurnTimer } from '../common/useTurnTimer.js';

interface PlayerSeatViewProps {
  player: SanitizedPlayerSeat;
  isCurrentTurn: boolean;
  isDealer: boolean;
  isMe: boolean;
  biddingText?: string;
  timer?: GameTimerState;
  className?: string;
}

export const PlayerSeatView: React.FC<PlayerSeatViewProps> = ({
  player,
  isCurrentTurn,
  isDealer,
  isMe,
  biddingText,
  timer,
  className = '',
}) => {
  const timerResult = useTurnTimer(timer, player.seatIndex, isCurrentTurn);
  const displayName = player.username || (player.userId ? 'Spieler' : 'Freier Platz');
  const initials = (player.username || '').slice(0, 2).toUpperCase() || '?';

  return (
    <div
      className={`relative flex flex-col items-center p-2 rounded-xl backdrop-blur-md transition-all duration-300 shadow-md ${
        isCurrentTurn
          ? 'bg-gradient-to-b from-amber-950/70 to-slate-900/90 border-2 border-amber-400 shadow-amber-500/20'
          : 'bg-slate-900/80 border border-slate-700/60'
      } ${className}`}
    >
      {/* Top Header Row inside the card */}
      <div className="w-full flex items-center justify-between min-h-[16px] mb-1 px-0.5 text-[9px] sm:text-[10px]">
        {/* Dealer Badge */}
        {isDealer ? (
          <span
            className="bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black px-1.5 py-0.2 rounded shadow-sm border border-yellow-300 tracking-wider"
            title="Geber"
          >
            GEBER
          </span>
        ) : (
          <span className="w-1" />
        )}

        {/* Role Badge */}
        {player.role === 'DECLARER' && (
          <span className="flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold px-2 py-0.2 rounded-full shadow-sm">
            <Crown className="w-2.5 h-2.5 text-slate-950" /> Alleinspieler
          </span>
        )}
        {player.role === 'DEFENDER' && (
          <span className="flex items-center gap-0.5 bg-slate-800 text-slate-200 font-semibold px-2 py-0.2 rounded-full shadow-sm border border-slate-600">
            <Shield className="w-2.5 h-2.5 text-slate-400" /> Gegner
          </span>
        )}
      </div>

      {/* Main Opponent Info: Avatar + Text + Card count */}
      <div className="flex items-center gap-2 w-full justify-between px-0.5">
        {/* Avatar & Online status */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
              isCurrentTurn
                ? 'border-amber-400 bg-amber-900 text-amber-100 shadow-md animate-pulse'
                : 'border-slate-600 bg-slate-800 text-slate-200'
            }`}
          >
            {player.isBot ? (
              <Bot className="w-4 h-4 text-amber-400" />
            ) : (
              initials
            )}
          </div>

          {/* Connection status light */}
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${
              player.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
            title={player.isOnline ? 'Online' : 'Nicht verbunden'}
          />
        </div>

        {/* Name and Info */}
        <div className="text-left leading-tight truncate flex-1 min-w-0">
          <div className="font-semibold text-xs text-slate-100 truncate">
            {displayName} {isMe && '(Du)'}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
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
            {timerResult.enabled && (
              <>
                <span className="text-slate-600">•</span>
                <span
                  className={`flex items-center gap-0.5 font-mono text-[9px] ${
                    isCurrentTurn && timerResult.isUrgent
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-400'
                  }`}
                  title="Verbleibende Gesamtbedenkzeit"
                >
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  {formatSecondsMMSS(timerResult.bankSecondsRemaining)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card Count for opponent */}
        {!isMe && (
          <div className="flex items-center gap-1 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800 flex-shrink-0">
            <CardBack size="sm" className="w-3.5 !aspect-[256/480]" />
            <span className="text-[10px] font-bold text-slate-300">{player.handCount}</span>
          </div>
        )}
      </div>

      {/* Bidding Speech Bubble if any */}
      {biddingText && (
        <div className="mt-1 px-2 py-0.2 bg-amber-950/80 border border-amber-500/40 rounded-full text-amber-200 text-[10px] font-medium text-center shadow-sm max-w-full truncate">
          {biddingText}
        </div>
      )}

      {/* Turn Indicator Pill */}
      {isCurrentTurn && (
        <span
          className={`absolute -bottom-2 px-2 py-0.2 rounded-full font-black text-[8px] sm:text-[9px] tracking-wider shadow uppercase border flex items-center gap-1 ${
            timerResult.enabled && timerResult.isUrgent
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-300 animate-pulse'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-yellow-300 animate-pulse'
          }`}
        >
          <span>Am Zug</span>
          {timerResult.enabled && (
            <span className="font-mono text-[9px] font-black ml-0.5">
              ⏱ {timerResult.turnSecondsRemaining}s
            </span>
          )}
        </span>
      )}
    </div>
  );
};
