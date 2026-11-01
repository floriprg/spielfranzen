import { GameMode, PlayedCard, SanitizedPlayerSeat, Trick } from '@spielfranzen/shared';
import { Eye, History, Target } from 'lucide-react';
import React, { useState } from 'react';
import { CardView } from '../cards/CardView.js';

interface TrickAreaProps {
  currentTrick: PlayedCard[];
  lastTrick: Trick | null;
  players: [SanitizedPlayerSeat, SanitizedPlayerSeat, SanitizedPlayerSeat];
  declarerCardPoints: number;
  defenderCardPoints: number;
  trickNumber: number;
  gameMode?: GameMode | null;
  declarerSeat?: number | null;
}

export const TrickArea: React.FC<TrickAreaProps> = ({
  currentTrick,
  lastTrick,
  players,
  declarerCardPoints,
  defenderCardPoints,
  trickNumber,
  gameMode,
  declarerSeat,
}) => {
  const [showLastTrick, setShowLastTrick] = useState<boolean>(false);

  // In Bettl (9 & 11) and Mord (10 & 12), card eyes/points are irrelevant!
  const isBettl = gameMode === 9 || gameMode === 11;
  const isMord = gameMode === 10 || gameMode === 12;
  const isBettlOrMord = isBettl || isMord;

  const declarerPlayer =
    players.find((p) => p.role === 'DECLARER') ||
    (declarerSeat !== null && declarerSeat !== undefined ? players[declarerSeat] : null);

  // Trick is complete when all 3 cards have been played
  const isTrickCompleted = currentTrick.length === 3;
  const winnerSeat = isTrickCompleted ? lastTrick?.winnerSeat : null;
  const winnerName =
    winnerSeat !== null && winnerSeat !== undefined ? players[winnerSeat]?.username : null;
  const trickPoints = isTrickCompleted
    ? lastTrick?.points || 0
    : currentTrick.reduce((acc, p) => acc + p.card.points, 0);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[230px] w-full max-w-xl mx-auto py-2">
      {/* Status Counters / Objectives at Table Top */}
      {isBettl ? (
        <div className="flex items-center gap-3 mb-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/80 border border-purple-500/50 rounded-full text-purple-200 shadow-sm">
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span>{gameMode === 11 ? 'Doppelbettl' : 'Bettl'} • Ziel: 0 Stiche für Alleinspieler</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-600 rounded-full text-slate-300">
            <span>
              Stiche Alleinspieler:{' '}
              <strong
                className={
                  (declarerPlayer?.tricksWon || 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                }
              >
                {declarerPlayer?.tricksWon || 0}
              </strong>
            </span>
          </div>
        </div>
      ) : isMord ? (
        <div className="flex items-center gap-3 mb-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/80 border border-rose-500/50 rounded-full text-rose-200 shadow-sm">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span>{gameMode === 12 ? 'Doppelmord' : 'Mord'} • Ziel: Alle 10 Stiche für Alleinspieler</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-600 rounded-full text-slate-300">
            <span>
              Stiche Alleinspieler:{' '}
              <strong className="text-amber-400 font-bold">{declarerPlayer?.tricksWon || 0} / 10</strong>
            </span>
          </div>
        </div>
      ) : (
        /* Color Game (5..8): Eyes matter! */
        <div className="flex items-center gap-4 mb-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/70 border border-amber-500/40 rounded-full text-amber-300">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Alleinspieler: {declarerCardPoints} / 66 Augen</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-600 rounded-full text-slate-300">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Gegner: {defenderCardPoints} / 66 Augen</span>
          </div>
        </div>
      )}

      {/* Main Trick Cards Display */}
      {showLastTrick && lastTrick ? (
        <div className="relative p-4 rounded-xl bg-slate-900/90 border border-amber-500/50 shadow-2xl flex flex-col items-center">
          <div className="text-xs text-amber-300 font-bold mb-2 flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Letzter Stich (#{lastTrick.trickNumber}) - Gewonnen
            von {players[lastTrick.winnerSeat!]?.username}
            {!isBettlOrMord && ` (${lastTrick.points} Augen)`}
          </div>
          <div className="flex items-center justify-center gap-3">
            {lastTrick.cards.map((play, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <CardView card={play.card} size="sm" isLegal={true} showPoints={!isBettlOrMord} />
                <span className="text-[10px] text-slate-300 font-medium mt-1">
                  {players[play.seatIndex]?.username}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowLastTrick(false)}
            className="mt-3 text-xs text-amber-400 hover:underline cursor-pointer"
          >
            Zurück zum aktuellen Stich
          </button>
        </div>
      ) : (
        <div className="relative w-full flex flex-col items-center justify-center min-h-[170px]">
          {/* Felt center circular marking */}
          <div className="absolute w-56 h-56 rounded-full border border-emerald-700/30 bg-emerald-950/20 pointer-events-none -z-0" />

          {currentTrick.length === 0 ? (
            <div className="text-center p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300/80 text-xs">
              Stich #{trickNumber || 1} • Noch keine Karte gespielt
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 z-10">
              {currentTrick.map((play, index) => {
                const isWinner = isTrickCompleted && play.seatIndex === winnerSeat;

                return (
                  <div
                    key={index}
                    className={`relative flex flex-col items-center transition-all duration-300 ${
                      isWinner
                        ? 'scale-105 z-20'
                        : isTrickCompleted
                        ? 'opacity-85 scale-95'
                        : 'animate-in fade-in zoom-in-95'
                    }`}
                  >
                    {isWinner && (
                      <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-lg flex items-center gap-1 animate-bounce z-30">
                        <span>👑 Gewinner{!isBettlOrMord && ` (+${trickPoints} Augen)`}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-xl transition-all ${
                        isWinner
                          ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.85)]'
                          : ''
                      }`}
                    >
                      <CardView card={play.card} size="md" isLegal={true} showPoints={!isBettlOrMord} />
                    </div>
                    <span
                      className={`text-xs font-semibold mt-1.5 px-2.5 py-0.5 rounded-full border shadow transition-all ${
                        isWinner
                          ? 'text-amber-300 bg-slate-900 border-amber-400/80 font-bold'
                          : 'text-amber-200/90 bg-slate-900/80 border-amber-500/20'
                      }`}
                    >
                      {players[play.seatIndex]?.username}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Banner & Countdown Bar for completed 3-card trick */}
          {isTrickCompleted && winnerName && (
            <div className="flex flex-col items-center mt-3 z-10 animate-in fade-in zoom-in-95">
              <div className="px-4 py-1 rounded-full bg-amber-950/90 border border-amber-400/80 text-amber-200 font-bold text-xs shadow-lg flex items-center gap-1.5">
                <span>
                  👑 Stich geht an <strong className="text-amber-300">{winnerName}</strong>
                  {!isBettlOrMord && ` (+${trickPoints} Augen)`}
                </span>
              </div>
              <div className="w-36 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden border border-slate-700/80 shadow-inner">
                <div className="h-full bg-amber-400 animate-[trickProgress_3.2s_linear]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle button for Last Trick (only if not currently reviewing a complete trick) */}
      {lastTrick && !showLastTrick && !isTrickCompleted && (
        <button
          onClick={() => setShowLastTrick(true)}
          className="mt-2 flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 bg-slate-900/60 hover:bg-slate-900 px-2.5 py-1 rounded-full border border-amber-500/20 transition-all cursor-pointer"
        >
          <History className="w-3 h-3" /> Letzten Stich ansehen
        </button>
      )}
    </div>
  );
};
