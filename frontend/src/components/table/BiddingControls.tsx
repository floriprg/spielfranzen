import { BiddingState, GameTimerState } from '@spielfranzen/shared';
import { Check, ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTurnTimer } from '../common/useTurnTimer.js';

interface BiddingControlsProps {
  biddingState: BiddingState;
  mySeatIndex: number;
  isMyTurn: boolean;
  onBid: (action: 'open' | 'raise' | 'hold' | 'pass', bidValue?: number) => void;
  timer?: GameTimerState;
}

export const BiddingControls: React.FC<BiddingControlsProps> = ({
  biddingState,
  mySeatIndex,
  isMyTurn,
  onBid,
  timer,
}) => {
  const timerResult = useTurnTimer(timer, mySeatIndex, isMyTurn);
  const { phase, currentBid, holderSeat, challengerSeat } = biddingState;
  const [customBid, setCustomBid] = useState<number>(currentBid + 1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHolder = mySeatIndex === holderSeat;
  const isChallenger = mySeatIndex === challengerSeat;

  // Available bids from currentBid + 1 up to 12
  const availableBids = Array.from(
    { length: Math.max(0, 12 - currentBid) },
    (_, i) => currentBid + 1 + i,
  );

  // Keep customBid valid whenever currentBid changes
  useEffect(() => {
    if (customBid <= currentBid || !availableBids.includes(customBid)) {
      setCustomBid(currentBid + 1 <= 12 ? currentBid + 1 : 12);
    }
  }, [currentBid, customBid, availableBids]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <div className="bg-slate-900/95 border border-amber-600/40 rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur-md max-w-md mx-auto w-full">
      <div className="text-center mb-2">
        <h3 className="text-amber-400 font-bold font-serif-vintage tracking-wide text-xs sm:text-sm">
          Das Bieten
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
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-center">
            <span
              className={
                timerResult.enabled && timerResult.isUrgent
                  ? 'text-rose-400 font-bold animate-pulse'
                  : 'text-amber-300 animate-pulse'
              }
            >
              Du bist am Zug! Wähle deine Aktion:
            </span>
            {timerResult.enabled && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  timerResult.isUrgent
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500 animate-pulse'
                    : 'bg-black/40 text-amber-200'
                }`}
              >
                ⏱ {timerResult.turnSecondsRemaining}s
              </span>
            )}
          </div>

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
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onBid('raise', currentBid + 1);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Bieten auf {currentBid + 1}
                </button>

                {availableBids.length > 0 && (
                  <div className="relative inline-flex items-center" ref={dropdownRef}>
                    <div className="flex items-stretch rounded-lg border border-amber-600/50 bg-slate-900/90 overflow-hidden focus-within:ring-1 focus-within:ring-amber-500 shadow">
                      {/* Dropdown Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Höheres Gebot auswählen"
                      >
                        <span>Direkt auf {customBid}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Divider */}
                      <div className="w-[1px] bg-amber-600/40" />

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onBid('raise', customBid);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                        title={`Auf ${customBid} bieten`}
                      >
                        Bieten
                      </button>
                    </div>

                    {/* Custom Dropdown Menu Popover */}
                    {isDropdownOpen && (
                      <div className="absolute top-full mt-1.5 left-0 z-50 w-44 bg-slate-900/98 backdrop-blur-xl border border-amber-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-amber-500/20 bg-slate-950/70">
                          Gebot wählen
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1 divide-y divide-slate-800/40">
                          {availableBids.map((val) => {
                            const isSelected = customBid === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setCustomBid(val);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500/25 text-amber-300 font-bold border-l-2 border-amber-400'
                                    : 'text-slate-200 hover:bg-slate-800 hover:text-amber-200'
                                }`}
                              >
                                <span>Direkt auf {val}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onBid('pass');
                  }}
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
