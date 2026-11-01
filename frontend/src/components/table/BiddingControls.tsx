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
    <div className="bg-slate-900/90 border border-amber-600/40 rounded-xl p-4 shadow-xl backdrop-blur-md max-w-lg mx-auto">
      <div className="text-center mb-3">
        <h3 className="text-amber-400 font-bold font-serif-vintage tracking-wide text-base">
          Das Bieten / Reizen
        </h3>
        <p className="text-xs text-slate-300 mt-0.5">
          {currentBid === 0
            ? 'Eröffnungsrunde (Vorhand-Halte-Prinzip)'
            : `Aktuelles Höchstgebot: ${currentBid} (${
                holderSeat !== null ? `gehalten von Platz ${holderSeat + 1}` : 'offen'
              })`}
        </p>
      </div>

      {/* Action Controls for Turn Player */}
      {isMyTurn ? (
        <div className="flex flex-col gap-2 p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-amber-300 font-semibold text-center mb-1 animate-pulse">
            Du bist am Zug! Wähle deine Aktion:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {phase === 'OPENING' && (
              <>
                <button
                  onClick={() => onBid('open')}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold shadow-md transition-all active:scale-95"
                >
                  Ich spiele (4)
                </button>
                <button
                  onClick={() => onBid('pass')}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-600 shadow-md transition-all active:scale-95"
                >
                  Weiter (Passen)
                </button>
              </>
            )}

            {phase === 'DUEL' && isChallenger && (
              <>
                <button
                  onClick={() => onBid('raise', currentBid + 1)}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold shadow-md transition-all active:scale-95"
                >
                  Reizen auf {currentBid + 1}
                </button>

                {currentBid + 2 <= 12 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={customBid}
                      onChange={(e) => setCustomBid(Number(e.target.value))}
                      className="bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 py-2 text-sm"
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
                      className="px-3 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white font-medium text-sm transition-all"
                    >
                      Bieten
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onBid('pass')}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-600 shadow-md transition-all active:scale-95"
                >
                  Weiter (Passen)
                </button>
              </>
            )}

            {phase === 'DUEL' && isHolder && (
              <>
                <button
                  onClick={() => onBid('hold')}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md transition-all active:scale-95"
                >
                  Halten ({currentBid})
                </button>
                <button
                  onClick={() => onBid('pass')}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-600 shadow-md transition-all active:scale-95"
                >
                  Gehen (Passen)
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2 text-center text-xs text-slate-400 bg-slate-800/40 rounded-lg">
          Warte auf Gebot von Spieler {biddingState.currentTurnSeat + 1}...
        </div>
      )}

      {/* Bidding History Feed */}
      <div className="mt-3 max-h-24 overflow-y-auto space-y-1 text-xs pr-1">
        {biddingState.history.slice(-4).map((h, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-800/60"
          >
            <span>{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
