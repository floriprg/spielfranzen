import { BiddingState } from '@spielfranzen/shared';
import React, { useState } from 'react';

interface BiddingControlsProps {
  biddingState: BiddingState;
  mySeatIndex: number;
  isMyTurn: boolean;
  onBid: (action: 'open' | 'raise' | 'hold' | 'pass', bidValue?: number) => void;
}

export const BiddingControls: React.FC<BiddingControlsProps> = ({
  biddingState,
  mySeatIndex,
  isMyTurn,
  onBid,
}) => {
  const { phase, currentBid, holderSeat, challengerSeat } = biddingState;
  const [customBid, setCustomBid] = useState<number>(currentBid + 1);

  const isHolder = mySeatIndex === holderSeat;
  const isChallenger = mySeatIndex === challengerSeat;

  return (
    <div className="bg-slate-900/95 border border-amber-600/40 rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur-md max-w-md mx-auto w-full">
      <div className="text-center mb-2">
        <h3 className="text-amber-400 font-bold font-serif-vintage tracking-wide text-xs sm:text-sm">
          Das Bieten / Reizen
        </h3>
        <p className="text-[11px] text-slate-300 mt-0.5">
          {currentBid === 0
            ? 'Eröffnungsrunde (Vorhand-Halte-Prinzip)'
            : `Höchstgebot: ${currentBid} (${
                holderSeat !== null ? `gehalten von Platz ${holderSeat + 1}` : 'offen'
              })`}
        </p>
      </div>

      {/* Action Controls for Turn Player */}
      {isMyTurn ? (
        <div className="flex flex-col gap-1.5 p-2 bg-amber-950/40 border border-amber-500/30 rounded-xl">
          <p className="text-[11px] text-amber-300 font-semibold text-center animate-pulse">
            Du bist am Zug! Wähle deine Aktion:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {phase === 'OPENING' && (
              <>
                <button
                  onClick={() => onBid('open')}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Ich spiele (4)
                </button>
                <button
                  onClick={() => onBid('pass')}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Weiter (Passen)
                </button>
              </>
            )}

            {phase === 'DUEL' && isChallenger && (
              <>
                <button
                  onClick={() => onBid('raise', currentBid + 1)}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Reizen auf {currentBid + 1}
                </button>

                {currentBid + 2 <= 12 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={customBid}
                      onChange={(e) => setCustomBid(Number(e.target.value))}
                      className="bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs cursor-pointer"
                    >
                      {Array.from({ length: 12 - currentBid }, (_, i) => currentBid + 1 + i).map(
                        (val) => (
                          <option key={val} value={val}>
                            Direkt auf {val}
                          </option>
                        ),
                      )}
                    </select>
                    <button
                      onClick={() => onBid('raise', customBid)}
                      className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-medium text-xs transition-all cursor-pointer"
                    >
                      Bieten
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onBid('pass')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-600 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Weiter (Passen)
                </button>
              </>
            )}

            {phase === 'DUEL' && isHolder && (
              <>
                <button
                  onClick={() => onBid('hold')}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Halten ({currentBid})
                </button>
                <button
                  onClick={() => onBid('pass')}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-600 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Gehen (Passen)
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-1.5 text-center text-[11px] text-slate-400 bg-slate-800/40 rounded-lg">
          Warte auf Gebot von Spieler {biddingState.currentTurnSeat + 1}...
        </div>
      )}

      {/* Compact Bidding History Feed (Last 2 entries only to keep table compact) */}
      {biddingState.history.length > 0 && (
        <div className="mt-2 px-2.5 py-1 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 flex flex-col gap-0.5 text-center">
          {biddingState.history.slice(-2).map((h, i) => (
            <div key={i} className="truncate">
              {h.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
