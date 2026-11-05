import { CardRank, GamePhase, Suit, WattenState } from '@spielfranzen/shared';
import { Award, Check, Crown, Flame, ShieldAlert, Sparkles, X } from 'lucide-react';
import React from 'react';
import { SuitIcon } from '../cards/SuitIcon.js';

interface WattenControlsProps {
  wattenState?: WattenState;
  mySeatIndex: number;
  isMyTurn: boolean;
  phase: GamePhase;
  onWattenAction: (
    action: 'choose_schlag' | 'choose_farbe' | 'bet' | 'hold' | 'fold',
    schlag?: CardRank,
    farbe?: Suit,
  ) => void;
  maxPlayers: number;
}

const RANK_LABELS: Record<number, string> = {
  9: 'Ass',
  7: 'König',
  6: 'Ober',
  5: 'Unter',
  8: '10er',
  4: '9er',
  3: '8er',
  2: '7er',
  1: 'Weli',
};

function getGueterRank(schlag: CardRank): CardRank | null {
  switch (schlag) {
    case 2: return 3; // 7 -> 8
    case 3: return 4; // 8 -> 9
    case 4: return 8; // 9 -> 10
    case 8: return 5; // 10 -> Unter
    case 5: return 6; // Unter -> Ober
    case 6: return 7; // Ober -> König
    case 7: return 9; // König -> Ass
    case 9: return 2; // Ass -> 7
    default: return null;
  }
}

function getSupergueterRank(schlag: CardRank): CardRank | null {
  const gueter = getGueterRank(schlag);
  return gueter ? getGueterRank(gueter) : null;
}

const SUITS: { suit: Suit; label: string; colorClass: string }[] = [
  { suit: 'HERZ', label: 'Herz', colorClass: 'from-rose-950 to-red-900 border-rose-500/60 text-rose-300' },
  { suit: 'SCHELL', label: 'Schell', colorClass: 'from-amber-950 to-yellow-900 border-yellow-500/60 text-yellow-300' },
  { suit: 'LAUB', label: 'Laub', colorClass: 'from-emerald-950 to-green-900 border-emerald-500/60 text-emerald-300' },
  { suit: 'EICHEL', label: 'Eichel', colorClass: 'from-stone-900 to-amber-950 border-amber-600/60 text-amber-300' },
];

export const WattenControls: React.FC<WattenControlsProps> = ({
  wattenState,
  mySeatIndex,
  isMyTurn,
  phase,
  onWattenAction,
  maxPlayers,
}) => {
  if (!wattenState) return null;

  const isSchlagChooser = wattenState.schlagChooserSeat === mySeatIndex;
  const isFarbeChooser = wattenState.farbeChooserSeat === mySeatIndex;
  const myTeam = mySeatIndex % 2;
  const challengerTeam =
    wattenState.betChallengerSeat !== null ? wattenState.betChallengerSeat % 2 : null;
  const isBetPendingAgainstMe = wattenState.betPending && challengerTeam !== myTeam;
  const isBetPendingByMyTeam = wattenState.betPending && challengerTeam === myTeam;

  // 1. Ansage-Phase (Schlag & Farbe)
  if (phase === 'BIDDING') {
    return (
      <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-4 max-w-lg w-full mx-auto shadow-2xl backdrop-blur-md text-center animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-center gap-2 mb-2 text-amber-400 font-serif-vintage font-bold text-base">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>Watten: Ansage-Phase</span>
        </div>

        {/* Step 1: Schlag wählen */}
        {!wattenState.schlag ? (
          <div>
            {isSchlagChooser ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-200">
                  Du bist die <strong>Vorhand</strong>. Wähle den <strong>Schlag</strong> (Rang):
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {[
                    { rank: 9 as CardRank, label: 'Ass' },
                    { rank: 7 as CardRank, label: 'König' },
                    { rank: 6 as CardRank, label: 'Ober' },
                    { rank: 5 as CardRank, label: 'Unter' },
                    { rank: 8 as CardRank, label: '10er' },
                    { rank: 4 as CardRank, label: '9er' },
                    { rank: 3 as CardRank, label: '8er' },
                    { rank: 2 as CardRank, label: '7er' },
                  ].map(({ rank, label }) => (
                    <button
                      key={rank}
                      onClick={() => onWattenAction('choose_schlag', rank)}
                      className="py-2.5 px-1 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs shadow-md border border-amber-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-300">
                  Warte auf Vorhand (Spieler {wattenState.schlagChooserSeat + 1}) für den Schlag...
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Farbe wählen */
          <div>
            <div className="mb-3 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 inline-flex items-center gap-2 text-xs font-bold text-amber-300">
              <span>Gewählter Schlag:</span>
              <strong className="text-white bg-amber-600 px-2 py-0.5 rounded">
                {RANK_LABELS[wattenState.schlag] || wattenState.schlag}
              </strong>
            </div>

            {isFarbeChooser ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-200">
                  Du bist der <strong>Geber</strong>. Wähle nun die <strong>Trumpffarbe</strong>:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUITS.map(({ suit, label, colorClass }) => (
                    <button
                      key={suit}
                      onClick={() => onWattenAction('choose_farbe', undefined, suit)}
                      className={`p-3 rounded-xl bg-gradient-to-b ${colorClass} border hover:scale-105 active:scale-95 transition-all shadow-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer font-bold text-xs`}
                    >
                      <SuitIcon suit={suit} size={24} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-300">
                  Warte auf Geber (Spieler {wattenState.farbeChooserSeat + 1}) für die Farbe...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. Trick Play Phase: Watten Header & Betting Box
  return (
    <div className="w-full max-w-xl mx-auto space-y-1.5 px-2">
      {/* Watten Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-600/40 shadow-md backdrop-blur-sm text-xs">
        {/* Rechter, Guater & Superguater */}
        <div className="flex items-center gap-2 font-bold flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Rechter:</span>
            {wattenState.farbe && <SuitIcon suit={wattenState.farbe} size={15} />}
            <span className="text-amber-300">
              {wattenState.farbe} {wattenState.schlag ? RANK_LABELS[wattenState.schlag] : ''}
            </span>
          </div>

          {wattenState.hasGueter !== false && wattenState.schlag && (
            <div className="flex items-center gap-1 text-[11px] text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
              <span className="text-slate-400">Guter:</span>
              <span>{RANK_LABELS[getGueterRank(wattenState.schlag) || 0]}</span>
            </div>
          )}

          {wattenState.hasSupergueter && wattenState.schlag && (
            <div className="flex items-center gap-1 text-[11px] text-yellow-300 bg-yellow-950/60 px-1.5 py-0.5 rounded border border-yellow-500/40">
              <span className="text-amber-400 font-black">★ Superguter:</span>
              <span>{RANK_LABELS[getSupergueterRank(wattenState.schlag) || 0]}</span>
            </div>
          )}
        </div>

        {/* Team Stiche & Zielpunkte */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400">Stiche:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold border ${
              myTeam === 0
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {maxPlayers === 4 ? 'Team 1' : 'Du'}: {wattenState.teamTricksWon[myTeam]}
          </span>
          <span className="text-slate-500">:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold border ${
              myTeam === 1
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {maxPlayers === 4 ? 'Team 2' : 'Gegner'}: {wattenState.teamTricksWon[1 - myTeam]}
          </span>
        </div>

        {/* Einsatz & Ziel */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[11px]">
            <Award className="w-3.5 h-3.5" />
            <span>Einsatz: {wattenState.currentBet} Pkt.</span>
          </div>
          <div className="text-[11px] font-bold text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
            Ziel: {wattenState.targetScore || 15} P.
          </div>
        </div>
      </div>

      {/* Betting Controls: Bet Pending / Challenge Response */}
      {isBetPendingAgainstMe && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-rose-950/90 border-2 border-rose-500 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-2 animate-bounce">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span className="text-xs font-bold text-rose-200">
              Gegner hat auf <strong>{wattenState.currentBet} Punkte</strong> erhöht!
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onWattenAction('hold')}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Halten ({wattenState.currentBet} Pkt.)</span>
            </button>
            <button
              onClick={() => onWattenAction('fold')}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>Gehen ({wattenState.currentBet - 1} Pkt. an Gegner)</span>
            </button>
            {wattenState.currentBet < 11 && (
              <button
                onClick={() => onWattenAction('bet')}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow cursor-pointer active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Schlagen ({wattenState.currentBet + 1})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isBetPendingByMyTeam && (
        <div className="p-2 rounded-xl bg-slate-900/80 border border-amber-500/40 text-center text-xs text-amber-300 font-semibold flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>Gebot auf {wattenState.currentBet} Punkte läuft. Warte auf Entscheidung des Gegners...</span>
        </div>
      )}

      {/* Button to Bet/Schlagen when not pending */}
      {!wattenState.betPending && isMyTurn && wattenState.currentBet < 11 && (
        <div className="flex justify-center">
          <button
            onClick={() => onWattenAction('bet')}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-md border border-yellow-300/60 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
            title="Einsatz um 1 Punkt erhöhen"
          >
            <Flame className="w-4 h-4" />
            <span>Schlagen auf {wattenState.currentBet + 1} Punkte!</span>
          </button>
        </div>
      )}
    </div>
  );
};
