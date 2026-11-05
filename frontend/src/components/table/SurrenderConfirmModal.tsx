import React, { useEffect } from 'react';
import { Flag, AlertTriangle, X } from 'lucide-react';
import { GameMode, GamePhase, GAME_MODE_INFO } from '@spielfranzen/shared';

interface SurrenderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSurrender: (surrenderType: 'round' | 'match') => void;
  isDeclarer: boolean;
  gameMode: GameMode | null;
  totalRounds: number;
  currentRound: number;
  phase: GamePhase;
}

export const SurrenderConfirmModal: React.FC<SurrenderConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmSurrender,
  isDeclarer,
  gameMode,
  totalRounds,
  currentRound,
  phase,
}) => {
  // Listen for Escape key to close modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modeInfo = gameMode ? GAME_MODE_INFO[gameMode] : null;
  const baseValue = modeInfo?.baseValue ?? 100;
  const isInActiveRound = phase === 'TRICK_PLAY' || phase === 'TALON_AND_DECLARATION';
  const hasMultipleRounds = totalRounds > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-rose-500/70 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-950 to-rose-700/60 border border-rose-500/50 flex items-center justify-center mx-auto mb-3 shadow-lg text-rose-400">
          <Flag className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold font-serif-vintage text-rose-200 mb-1">
          Spiel wirklich aufgeben?
        </h3>

        <p className="text-xs text-slate-300 mb-4">
          Bist du sicher, dass du aufgeben möchtest? Dies kann nicht rückgängig gemacht werden.
        </p>

        {/* Consequences Box */}
        <div className="bg-slate-950/80 border border-rose-900/60 rounded-2xl p-3.5 mb-5 text-left text-xs space-y-2">
          <div className="flex items-start gap-2 text-rose-300 font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <span>Konsequenzen der Aufgabe:</span>
          </div>

          {isInActiveRound ? (
            isDeclarer ? (
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Du spielst als <strong className="text-amber-300">Alleinspieler</strong> ({modeInfo?.name ?? 'Farbspiel'}).
                Bei Aufgabe wird die aktuelle Runde für dich mit{' '}
                <strong className="text-rose-400">-{baseValue} Punkten</strong> gewertet. Jeder Gegner erhält{' '}
                <strong className="text-emerald-400">+{baseValue / 2} Punkte</strong>.
              </p>
            ) : (
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Du spielst als <strong className="text-amber-300">Verteidiger</strong>.
                Bei Aufgabe wird die Runde verloren gegeben. Der Alleinspieler erhält{' '}
                <strong className="text-emerald-400">+{baseValue} Punkte</strong>, die Verteidiger{' '}
                <strong className="text-rose-400">-{baseValue / 2} Punkte</strong>.
              </p>
            )
          ) : (
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Das Match wird sofort abgebrochen und mit dem aktuellen Punktestand abgeschlossen.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isInActiveRound && hasMultipleRounds ? (
            <>
              <button
                onClick={() => {
                  onConfirmSurrender('round');
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-rose-500/50"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Nur Runde {currentRound} aufgeben</span>
              </button>

              <button
                onClick={() => {
                  onConfirmSurrender('match');
                  onClose();
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/90 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-700/60 text-slate-300 hover:text-rose-200 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Ganzes Match beenden & aufgeben</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onConfirmSurrender(isInActiveRound ? 'round' : 'match');
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-rose-500/50"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Ja, jetzt aufgeben</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer mt-1"
          >
            Abbrechen (Weiterspielen)
          </button>
        </div>
      </div>
    </div>
  );
};
