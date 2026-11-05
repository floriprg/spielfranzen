import {
  Card,
  GameType,
  SCHNAPSEN_CALL_CONFIG,
  SchnapsenCallType,
  SchnapsenState,
  Suit,
} from '@spielfranzen/shared';
import { Check, Crown, Eye, Flame, Lock, RefreshCw, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import React, { useState } from 'react';
import { SuitIcon } from '../cards/SuitIcon.js';

interface SchnapsenControlsProps {
  schnapsenState?: SchnapsenState;
  mySeatIndex: number;
  isMyTurn: boolean;
  myHand: Card[];
  currentTrickLength: number;
  onSchnapsenAction: (action: any, payload?: any) => void;
  gameType?: GameType;
}

const SUIT_NAMES: Record<Suit, string> = {
  HERZ: 'Herz',
  SCHELL: 'Schell',
  LAUB: 'Laub',
  EICHEL: 'Eichel',
};

export const SchnapsenControls: React.FC<SchnapsenControlsProps> = ({
  schnapsenState,
  mySeatIndex,
  isMyTurn,
  myHand,
  currentTrickLength,
  onSchnapsenAction,
  gameType,
}) => {
  if (!schnapsenState) return null;

  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);

  const is2Player = gameType === 'schnapsen_2';
  const myEyes = schnapsenState.playerEyes[mySeatIndex] || 0;
  const opponentSeat = (mySeatIndex + 1) % (is2Player ? 2 : 3);
  const opponentEyes = schnapsenState.playerEyes[opponentSeat] || 0;

  // Check possible marriages: player holds both King (rank 7) and Ober (rank 6) in the same suit
  const possibleMarriages: { suit: Suit; isTrump: boolean }[] = [];
  const suits: Suit[] = ['HERZ', 'SCHELL', 'LAUB', 'EICHEL'];
  for (const s of suits) {
    const hasKing = myHand.some((c) => c.suit === s && c.rank === 7);
    const hasOber = myHand.some((c) => c.suit === s && c.rank === 6);
    if (hasKing && hasOber) {
      possibleMarriages.push({
        suit: s,
        isTrump: s === schnapsenState.trumpSuit,
      });
    }
  }

  // Check if player has the Trumpf-Unter (rank 5) to swap with face-up trump
  const hasTrumpUnter = myHand.some(
    (c) => c.suit === schnapsenState.trumpSuit && c.rank === 5,
  );
  const canSwapTrump =
    isMyTurn &&
    currentTrickLength === 0 &&
    hasTrumpUnter &&
    schnapsenState.stockCount > 2 &&
    !schnapsenState.talonClosed &&
    schnapsenState.allowTrumpfTausch !== false &&
    !!schnapsenState.trumpCard;

  const canCloseTalon =
    isMyTurn &&
    currentTrickLength === 0 &&
    schnapsenState.stockCount > 2 &&
    schnapsenState.allowZudrehen !== false &&
    !schnapsenState.talonClosed;

  const canClaim66 = isMyTurn;

  const toggleDiscard = (cardId: string) => {
    if (selectedDiscards.includes(cardId)) {
      setSelectedDiscards(selectedDiscards.filter((id) => id !== cardId));
    } else if (selectedDiscards.length < 2) {
      setSelectedDiscards([...selectedDiscards, cardId]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2 px-2">
      {/* Schnapsen Header Bar: Trumpf, Augen & Talon Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-600/40 shadow-md backdrop-blur-sm text-xs">
        {/* Atout / Trumpf Suit */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-slate-400">Atout:</span>
          <SuitIcon suit={schnapsenState.trumpSuit} size={16} />
          <span className="text-amber-300 font-bold">
            {SUIT_NAMES[schnapsenState.trumpSuit]}
          </span>
        </div>

        {/* Contract display if active */}
        {schnapsenState.callType && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-200 font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {SCHNAPSEN_CALL_CONFIG[schnapsenState.callType]?.name} ({SCHNAPSEN_CALL_CONFIG[schnapsenState.callType]?.points} P.)
            </span>
            {schnapsenState.kontraLevel > 1 && (
              <span className="text-rose-400 font-mono ml-1">
                [{schnapsenState.kontraLevel}x]
              </span>
            )}
          </div>
        )}

        {/* Eyes / Augen Display (Ziel 66) */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Augen:</span>
          </span>
          <span className="px-2 py-0.5 rounded font-bold bg-amber-950/70 text-amber-300 border border-amber-500/50">
            Du: {myEyes} / 66
          </span>
          <span className="text-slate-500">:</span>
          <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Gegner: {opponentEyes} / 66
          </span>
        </div>

        {/* Bummerl Standings */}
        {schnapsenState.targetBummerl && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-200 font-bold text-[11px]">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Bummerl: {schnapsenState.bummerlsWon ? schnapsenState.bummerlsWon[mySeatIndex] || 0 : 0} / {schnapsenState.targetBummerl}
            </span>
          </div>
        )}

        {/* Talon / Stock Status */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          {schnapsenState.talonClosed ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-300 flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3" />
              <span>Talon zugedreht</span>
            </span>
          ) : is2Player ? (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <span>Talon: {schnapsenState.stockCount} Karten</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* PHASE 1: ATOUT SELECTION */}
      {schnapsenState.schnapsenPhase === 'ATOUT_SELECTION' && isMyTurn && (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-amber-500/60 shadow-lg text-center space-y-2">
          <p className="text-xs font-bold text-amber-300">
            👑 Vorhand: Bestimme die Atout-Farbe (Trumpf)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suits.map((suit) => (
              <button
                key={suit}
                onClick={() => onSchnapsenAction('select_atout', { suit })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 text-white font-bold text-xs border border-slate-700 hover:border-amber-400 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <SuitIcon suit={suit} size={16} />
                <span>{SUIT_NAMES[suit]}</span>
              </button>
            ))}
            <button
              onClick={() => onSchnapsenAction('reveal_card', { cardIndex: 3 })}
              className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs border border-indigo-400 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Aufschlagen (Karte aufdecken)</span>
            </button>
            {schnapsenState.atoutSelection?.canRedeal3Buben && (
              <button
                onClick={() => onSchnapsenAction('redeal_3_buben')}
                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs border border-rose-400 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>3 Buben! Neu geben</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE 2: BIDDING (Lizitation) */}
      {schnapsenState.schnapsenPhase === 'BIDDING' && isMyTurn && (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-amber-500/60 shadow-lg text-center space-y-2">
          <p className="text-xs font-bold text-amber-300">
            🃏 Lizitation: Wähle ein Spiel oder passe
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              onClick={() => onSchnapsenAction('pass')}
              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs border border-slate-500 cursor-pointer"
            >
              Passen („Gut“)
            </button>
            {schnapsenState.callType && schnapsenState.kontraLevel < 8 && (
              <button
                onClick={() => onSchnapsenAction('kontra')}
                className="px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs border border-rose-400 cursor-pointer flex items-center gap-1"
              >
                <Flame className="w-3 h-3 text-amber-300" />
                <span>Spritzen ({schnapsenState.kontraLevel * 2}x)</span>
              </button>
            )}
            {(['BETTLER', 'ASSBETTLER', 'SCHNAPSER', 'GANGL', 'ZEHNERLOCH', 'BAUERNSCHNAPSER'] as SchnapsenCallType[]).map((call) => (
              <button
                key={call}
                onClick={() => onSchnapsenAction('bid', { callType: call })}
                className="px-2.5 py-1 rounded bg-amber-800 hover:bg-amber-600 text-amber-100 font-bold text-xs border border-amber-500/50 cursor-pointer transition-all"
              >
                {SCHNAPSEN_CALL_CONFIG[call].name} ({SCHNAPSEN_CALL_CONFIG[call].points} P.)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PHASE 3: TALON EXCHANGE (Drücken im Dreierschnapsen) */}
      {schnapsenState.schnapsenPhase === 'TALON_EXCHANGE' && isMyTurn && (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-purple-500/60 shadow-lg text-center space-y-2">
          <p className="text-xs font-bold text-purple-300">
            📥 Talon aufnehmen & drücken: Wähle 2 Karten zum verdeckten Ablegen ({selectedDiscards.length}/2)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {myHand.map((c) => {
              const isSelected = selectedDiscards.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleDiscard(c.id)}
                  className={`px-2.5 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-300 ring-2 ring-purple-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-purple-400'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          {selectedDiscards.length === 2 && (
            <button
              onClick={() => onSchnapsenAction('exchange_talon', { discardIds: selectedDiscards })}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md border border-emerald-400 cursor-pointer"
            >
              Karten ablegen & Spiel starten
            </button>
          )}
        </div>
      )}

      {/* PHASE 4: TRICK PLAY SPECIAL ACTIONS */}
      {schnapsenState.schnapsenPhase === 'TRICK_PLAY' && isMyTurn && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
          {/* Claim 66 ("Danke genug") */}
          {canClaim66 && (
            <button
              onClick={() => onSchnapsenAction('declare_66')}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md border border-amber-200 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
              title="„Danke genug“ sagen (>= 66 Augen)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-900" />
              <span>„Danke genug“ (66 Augen)</span>
            </button>
          )}

          {/* Leading special actions: 20/40, Trumpftausch, Zudrehen */}
          {currentTrickLength === 0 && (
            <>
              {possibleMarriages.map(({ suit, isTrump }) => (
                <button
                  key={suit}
                  onClick={() => onSchnapsenAction('announce_marriage', { suit })}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white font-bold text-xs shadow-md border border-amber-300/60 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
                  title={`${isTrump ? '40er' : '20er'} ansagen (${SUIT_NAMES[suit]})`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isTrump ? '40er Ansagen' : '20er Ansagen'} ({SUIT_NAMES[suit]})
                  </span>
                </button>
              ))}

              {canSwapTrump && (
                <button
                  onClick={() => onSchnapsenAction('swap_trump')}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-xs shadow-md border border-emerald-300/60 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
                  title="Atout-Unter gegen die aufgedeckte Trumpfkarte tauschen"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Trumpf tauschen (Atout Unter)</span>
                </button>
              )}

              {canCloseTalon && (
                <button
                  onClick={() => onSchnapsenAction('close_talon')}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-md border border-rose-300/60 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
                  title="Talon zudrehen (Farb- und Stichzwang gilt ab sofort)"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-200" />
                  <span>Talon zudrehen</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
