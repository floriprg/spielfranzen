import { GAME_MODE_INFO, RoundResult, SanitizedPlayerSeat } from '@spielfranzen/shared';
import { ArrowRight, Award, Trophy, XCircle } from 'lucide-react';
import React from 'react';

interface RoundSummaryModalProps {
  roundResult: RoundResult;
  players: [SanitizedPlayerSeat, SanitizedPlayerSeat, SanitizedPlayerSeat];
  onNextRound: () => void;
  isHost: boolean;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  roundResult,
  players,
  onNextRound,
  isHost,
}) => {
  const {
    roundNumber,
    declarerSeat,
    gameMode,
    declarerWon,
    scoreDeltaDeclarer,
    scoreDeltaDefenders,
    reason,
  } = roundResult;

  const modeInfo = GAME_MODE_INFO[gameMode];
  const declarer = players[declarerSeat];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center">
        {/* Header Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 bg-amber-950/80 border-2 border-amber-400">
          {declarerWon ? (
            <Trophy className="w-8 h-8 text-amber-400" />
          ) : (
            <XCircle className="w-8 h-8 text-rose-500" />
          )}
        </div>

        <h2 className="text-2xl font-bold font-serif-vintage text-amber-300">
          Runde {roundNumber} beendet
        </h2>

        <p className="text-sm font-semibold text-slate-200 mt-1">
          {declarerWon ? (
            <span className="text-emerald-400">
              Alleinspieler {declarer?.username} hat gewonnen!
            </span>
          ) : (
            <span className="text-rose-400">
              Die Gegner haben das Spiel von {declarer?.username} abgewehrt!
            </span>
          )}
        </p>

        {/* Reason pill */}
        <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300 border border-slate-700">
          {reason}
        </div>

        {/* Mode info */}
        <div className="mt-3 text-xs text-amber-400/90 font-medium">
          Gespielter Modus: {modeInfo?.name} (Basiswert: {modeInfo?.baseValue} Pkt)
        </div>

        {/* Score Changes Table */}
        <div className="my-5 bg-slate-950/80 rounded-xl p-4 border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Punkteabrechnung (Nullsummenspiel)
          </h4>
          <div className="space-y-2">
            {players.map((p) => {
              const isDec = p.seatIndex === declarerSeat;
              const delta = isDec ? scoreDeltaDeclarer : scoreDeltaDefenders;
              return (
                <div
                  key={p.seatIndex}
                  className="flex items-center justify-between text-sm py-1 border-b border-slate-800/60 last:border-0"
                >
                  <span className="font-medium text-slate-200">
                    {p.username} {isDec ? '(Alleinspieler)' : '(Gegner)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold ${
                        delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta} Pkt
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (Gesamt: {p.score})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Button to advance */}
        <button
          onClick={onNextRound}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Nächste Runde starten</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
