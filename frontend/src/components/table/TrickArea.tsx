import { PlayedCard, SanitizedPlayerSeat, Trick } from '@spielfranzen/shared';
import { Eye, History } from 'lucide-react';
import React, { useState } from 'react';
import { CardView } from '../cards/CardView.js';

interface TrickAreaProps {
  currentTrick: PlayedCard[];
  lastTrick: Trick | null;
  players: [SanitizedPlayerSeat, SanitizedPlayerSeat, SanitizedPlayerSeat];
  declarerCardPoints: number;
  defenderCardPoints: number;
  trickNumber: number;
}

export const TrickArea: React.FC<TrickAreaProps> = ({
  currentTrick,
  lastTrick,
  players,
  declarerCardPoints,
  defenderCardPoints,
  trickNumber,
}) => {
  const [showLastTrick, setShowLastTrick] = useState<boolean>(false);

  // Trick points in the center
  const currentTrickPoints = currentTrick.reduce((acc, p) => acc + p.card.points, 0);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[220px] w-full max-w-xl mx-auto py-2">
      {/* Eye Counters / Eyes on Table */}
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

      {/* Main Trick Cards Display */}
      {showLastTrick && lastTrick ? (
        <div className="relative p-4 rounded-xl bg-slate-900/90 border border-amber-500/50 shadow-2xl flex flex-col items-center">
          <div className="text-xs text-amber-300 font-bold mb-2 flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Letzter Stich (#{lastTrick.trickNumber}) - Gewonnen
            von {players[lastTrick.winnerSeat!]?.username} ({lastTrick.points} Augen)
          </div>
          <div className="flex items-center justify-center gap-3">
            {lastTrick.cards.map((play, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <CardView card={play.card} size="sm" isLegal={true} />
                <span className="text-[10px] text-slate-300 font-medium mt-1">
                  {players[play.seatIndex]?.username}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowLastTrick(false)}
            className="mt-3 text-xs text-amber-400 hover:underline"
          >
            Zurück zum aktuellen Stich
          </button>
        </div>
      ) : (
        <div className="relative w-full flex items-center justify-center min-h-[160px]">
          {/* Felt center circular marking */}
          <div className="absolute w-56 h-56 rounded-full border border-emerald-700/30 bg-emerald-950/20 pointer-events-none -z-0" />

          {currentTrick.length === 0 ? (
            <div className="text-center p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300/80 text-xs">
              Stich #{trickNumber || 1} • Noch keine Karte gespielt
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 z-10">
              {currentTrick.map((play, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center transition-all duration-300 animate-in fade-in zoom-in-95"
                >
                  <CardView card={play.card} size="md" isLegal={true} />
                  <span className="text-xs font-semibold text-amber-200 mt-1 px-2 py-0.5 rounded bg-slate-900/80 border border-amber-500/20 shadow">
                    {players[play.seatIndex]?.username}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toggle button for Last Trick */}
      {lastTrick && !showLastTrick && (
        <button
          onClick={() => setShowLastTrick(true)}
          className="mt-2 flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 bg-slate-900/60 hover:bg-slate-900 px-2.5 py-1 rounded-full border border-amber-500/20 transition-all"
        >
          <History className="w-3 h-3" /> Letzten Stich ansehen
        </button>
      )}
    </div>
  );
};
