import { Card, GAME_MODE_INFO, GameMode, GameTimerState } from '@spielfranzen/shared';
import { Clock } from 'lucide-react';
import React, { useState } from 'react';
import { CardBack } from '../cards/CardBack.js';
import { CardView } from '../cards/CardView.js';
import { formatSecondsMMSS, useTurnTimer } from '../common/useTurnTimer.js';

interface TalonModalProps {
  myHand: Card[];
  talonCards: Card[] | null;
  minMode: GameMode;
  onTalonAction: (
    action: 'take_talon' | 'declare_hand' | 'discard_and_declare',
    discardedCardIds?: string[],
    selectedMode?: number,
  ) => void;
  timer?: GameTimerState;
  seatIndex?: number;
}

export const TalonModal: React.FC<TalonModalProps> = ({
  myHand,
  talonCards,
  minMode,
  onTalonAction,
  timer,
  seatIndex = 0,
}) => {
  const timerResult = useTurnTimer(timer, seatIndex, true);

  // Discards selection (for Phase 2 when talon is taken)
  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);

  // Selected mode for Phase 2 (5..10)
  const [selectedMode, setSelectedMode] = useState<number>(
    minMode <= 10 ? Math.max(5, minMode) : 11
  );

  // Selected mode for Handspiel in Phase 1 (11 or 12)
  const [selectedHandMode, setSelectedHandMode] = useState<11 | 12>(
    minMode === 12 ? 12 : 11
  );

  // Has the talon been revealed?
  const hasRevealedTalon = talonCards !== null && talonCards.length > 0;

  // Available 13 cards (hand + talon)
  const allCards = talonCards ? [...myHand, ...talonCards] : myHand;

  const toggleDiscard = (cardId: string) => {
    if (selectedDiscards.includes(cardId)) {
      setSelectedDiscards(selectedDiscards.filter((id) => id !== cardId));
    } else {
      if (selectedDiscards.length < 3) {
        setSelectedDiscards([...selectedDiscards, cardId]);
      }
    }
  };

  const allowedWithTalonModes = ([5, 6, 7, 8, 9, 10] as GameMode[]).filter((m) => m >= minMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl my-auto">
        {timerResult.enabled && (
          <div className="flex justify-center mb-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border shadow ${
                timerResult.isUrgent
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500 animate-pulse'
                  : 'bg-slate-800/90 text-amber-300 border-amber-500/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Bedenkzeit: {timerResult.turnSecondsRemaining}s</span>
              <span className="text-slate-400 font-normal">
                (Gesamt: {formatSecondsMMSS(timerResult.bankSecondsRemaining)})
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 1: ENTSCHEIDUNG (BEVOR TALON AUFGEDECKT WIRD)      */}
        {/* ========================================================= */}
        {!hasRevealedTalon ? (
          <div>
            <div className="text-center mb-5">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-bold px-3 py-1 bg-amber-950/60 rounded-full border border-amber-500/30">
                Phase: Talon-Entscheidung
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-vintage text-amber-400 mt-2">
                Mit oder ohne Talon spielen?
              </h2>
              <p className="text-sm text-slate-300 max-w-xl mx-auto mt-1">
                Du hast das Bieten mit <strong className="text-amber-400">{minMode}</strong> gewonnen!
                Entscheide zuerst, ob du den Talon aufnehmen willst oder direkt ein Handspiel ansagst.
                <span className="block text-amber-300/90 text-xs mt-0.5">
                  (Der Inhalt des Talons wird erst nach der Entscheidung aufgedeckt!)
                </span>
              </p>
            </div>

            {/* Current 10 Hand Cards */}
            <div className="mb-5 p-3 sm:p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Deine 10 Handkarten:
                </span>
                <span className="text-xs text-slate-400">Prüfe deine Karten vor der Entscheidung</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {myHand.map((card) => (
                  <CardView key={card.id} card={card} size="sm" isLegal={true} showPoints={true} />
                ))}
              </div>
            </div>

            {/* The 3 Closed Face-Down Talon Cards */}
            <div className="mb-6 p-4 bg-emerald-950/20 rounded-xl border border-emerald-700/40 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm font-bold text-amber-300">
                  Der Talon (3 verdeckte Karten):
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 py-1">
                <CardBack size="sm" className="shadow-lg transform -rotate-3" />
                <CardBack size="sm" className="shadow-xl scale-105 z-10" />
                <CardBack size="sm" className="shadow-lg transform rotate-3" />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Liegt verdeckt auf dem Tisch. Du musst dich vor dem Aufdecken entscheiden!
              </p>
            </div>

            {/* Decision Cards: Mit Talon vs Handspiel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Option A: Mit Talon spielen */}
              <div
                className={`p-5 rounded-xl border-2 flex flex-col justify-between transition-all ${
                  minMode <= 10
                    ? 'border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-slate-900/80 hover:border-amber-400'
                    : 'border-slate-800 bg-slate-950/40 opacity-40 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-amber-300 font-serif-vintage">
                      🃏 Mit Talon spielen
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Modi 5 – 10
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Nimm die 3 Talon-Karten auf (13 Karten). Anschließend siehst du ihren Inhalt, drückst 3 Karten weg und wählst dein Farbspiel, Bettl oder Mord.
                  </p>
                </div>

                <button
                  disabled={minMode > 10}
                  onClick={() => onTalonAction('take_talon')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-lg transition-all ${
                    minMode <= 10
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black cursor-pointer shadow-amber-900/30 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {minMode <= 10 ? 'Talon aufnehmen & ansehen →' : 'Nicht möglich (Gebot erfordert Handspiel)'}
                </button>
              </div>

              {/* Option B: Handspiel ohne Talon */}
              <div className="p-5 rounded-xl border-2 border-purple-500/60 bg-gradient-to-b from-purple-950/30 to-slate-900/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-purple-300 font-serif-vintage">
                      👑 Handspiel ohne Talon
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Modi 11 & 12
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Spiele direkt mit deinen 10 Handkarten. Der Talon bleibt für alle verdeckt und unberührt.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => setSelectedHandMode(11)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedHandMode === 11
                          ? 'border-purple-400 bg-purple-900/40 text-purple-200 ring-2 ring-purple-400'
                          : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">11: Doppelbettl</div>
                      <div className="text-[10px] opacity-75">0 Stiche • 400 Pkt</div>
                    </button>
                    <button
                      onClick={() => setSelectedHandMode(12)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedHandMode === 12
                          ? 'border-purple-400 bg-purple-900/40 text-purple-200 ring-2 ring-purple-400'
                          : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">12: Doppelmord</div>
                      <div className="text-[10px] opacity-75">Alle Stiche • 600 Pkt</div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => onTalonAction('declare_hand', undefined, selectedHandMode)}
                  className="w-full py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 active:scale-[0.98] cursor-pointer"
                >
                  Handspiel {selectedHandMode} ansagen & starten
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* PHASE 2: TALON AUFGEDECKT (KARTEN WEGDRÜCKEN & ANSAGEN)  */
          /* ========================================================= */
          <div>
            <div className="text-center mb-4">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold px-3 py-1 bg-emerald-950/60 rounded-full border border-emerald-500/30">
                Talon aufgedeckt
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-vintage text-amber-400 mt-2">
                Karten wegdrücken & Spielmodus wählen
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mt-1">
                Wähle genau 3 Karten zum Wegdrücken. Diese scheiden aus dem Spiel aus (0 Punkte).
                Wähle anschließend deinen Spielmodus (mind. {minMode}).
              </p>
            </div>

            {/* Newly revealed Talon Cards Highlight */}
            {talonCards && talonCards.length > 0 && (
              <div className="mb-4 p-3 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/40 rounded-xl border border-amber-500/40 text-center">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-1.5">
                  ✨ Neu aus dem Talon erhalten:
                </span>
                <div className="flex items-center justify-center gap-3">
                  {talonCards.map((card) => (
                    <div key={card.id} className="flex flex-col items-center">
                      <CardView card={card} size="sm" isLegal={true} showPoints={true} />
                      <span className="text-[10px] font-bold text-amber-400 mt-1 px-1.5 py-0.2 bg-amber-950 rounded border border-amber-500/50">
                        Talon
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. Discard Selection (13 Cards) */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-bold text-amber-300">
                  1. Drücke 3 Karten weg ({selectedDiscards.length} / 3 ausgewählt)
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedDiscards.length === 3
                    ? '✓ 3 Karten ausgewählt'
                    : `Noch ${3 - selectedDiscards.length} Karte(n) auswählen`}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                {allCards.map((card) => {
                  const isDiscard = selectedDiscards.includes(card.id);
                  return (
                    <div key={card.id} className="relative">
                      <CardView
                        card={card}
                        size="sm"
                        isSelected={isDiscard}
                        onClick={() => toggleDiscard(card.id)}
                      />
                      {isDiscard && (
                        <div className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-rose-400 flex items-center gap-0.5 z-40 pointer-events-none">
                          ✕ Weg
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Choose Game Mode (5 - 10) */}
            <div className="mb-6">
              <h3 className="text-sm sm:text-base font-bold text-amber-300 mb-2">
                2. Wähle deinen Spielmodus (Mindestwert: {minMode})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {allowedWithTalonModes.map((m) => {
                  const info = GAME_MODE_INFO[m];
                  const isCurrent = selectedMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMode(m)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-950/50 shadow-md ring-2 ring-amber-400 text-amber-200'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{info.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {info.description}
                      </div>
                      <div className="text-[10px] font-semibold text-amber-400 mt-1">
                        Basiswert: {info.baseValue} Pkt
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm Discard & Declaration Button */}
            <button
              disabled={selectedDiscards.length !== 3}
              onClick={() => onTalonAction('discard_and_declare', selectedDiscards, selectedMode)}
              className={`w-full py-3.5 px-6 rounded-xl font-black text-sm sm:text-base shadow-xl transition-all ${
                selectedDiscards.length === 3
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {selectedDiscards.length === 3
                ? `3 Karten wegdrücken & ${GAME_MODE_INFO[selectedMode as GameMode]?.name || ''} starten →`
                : `Wähle noch ${3 - selectedDiscards.length} Karte(n) zum Wegdrücken`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
