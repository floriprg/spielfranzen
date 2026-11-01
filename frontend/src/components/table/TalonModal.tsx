import { Card, GAME_MODE_INFO, GameMode } from '@spielfranzen/shared';
import React, { useState } from 'react';
import { CardView } from '../cards/CardView.js';

interface TalonModalProps {
  myHand: Card[];
  talonCards: Card[] | null;
  minMode: GameMode;
  onTalonAction: (
    action: 'take_talon' | 'declare_hand',
    discardedCardIds?: string[],
    selectedMode?: number,
  ) => void;
}

export const TalonModal: React.FC<TalonModalProps> = ({
  myHand,
  talonCards,
  minMode,
  onTalonAction,
}) => {
  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<number>(minMode);
  const [wantsHandspiel, setWantsHandspiel] = useState<boolean>(minMode >= 11);

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

  const allowedModes = [5, 6, 7, 8, 9, 10].filter((m) => m >= minMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-4xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold font-serif-vintage text-amber-400">
            Talon & Spielansage
          </h2>
          <p className="text-sm text-slate-300">
            Du hast das Bieten gewonnen! Dein Mindestspielwert ist {minMode}.
          </p>
        </div>

        {/* Option Toggle: Handspiel (11/12) vs Mit Talon (5-10) */}
        {minMode <= 10 && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setWantsHandspiel(false)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                !wantsHandspiel
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-md'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              Mit Talon spielen (Modi 5 - 10)
            </button>
            <button
              onClick={() => {
                setWantsHandspiel(true);
                setSelectedMode(11);
              }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                wantsHandspiel
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              Handspiel ohne Talon (11 oder 12)
            </button>
          </div>
        )}

        {/* Handspiel Mode Selection */}
        {wantsHandspiel ? (
          <div className="bg-slate-800/60 p-6 rounded-xl border border-purple-500/30 text-center mb-6">
            <h3 className="text-lg font-bold text-purple-300 mb-2 font-serif-vintage">
              Handspiel ohne Talon
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Der Talon bleibt unberührt. Wähle dein Handspiel:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
              <button
                onClick={() => setSelectedMode(11)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMode === 11
                    ? 'border-purple-400 bg-purple-950/60 shadow-lg ring-2 ring-purple-400'
                    : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-purple-200">11: Doppelbettl</div>
                <div className="text-xs text-slate-400 mt-1">Kein Trumpf • 0 Stiche • 400 Punkte</div>
              </button>

              <button
                onClick={() => setSelectedMode(12)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMode === 12
                    ? 'border-purple-400 bg-purple-950/60 shadow-lg ring-2 ring-purple-400'
                    : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-purple-200">12: Doppelmord</div>
                <div className="text-xs text-slate-400 mt-1">Kein Trumpf • Alle 10 Stiche • 600 Punkte</div>
              </button>
            </div>

            <button
              onClick={() => onTalonAction('declare_hand', undefined, selectedMode)}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base shadow-lg transition-all"
            >
              Handspiel {selectedMode} ansagen & starten
            </button>
          </div>
        ) : (
          /* Normal Talon Pickup and Discard */
          <div>
            {/* Step 1: Discard 3 Cards */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-amber-300">
                  1. Drücke 3 Karten weg ({selectedDiscards.length} / 3 ausgewählt)
                </h3>
                <span className="text-xs text-slate-400">
                  Klicke auf 3 Karten, die aus dem Spiel genommen werden (0 Punkte für alle).
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
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
                        <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                          ✕
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Game Mode */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-amber-300 mb-2">
                2. Wähle deinen Spielmodus
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allowedModes.map((mode) => {
                  const info = GAME_MODE_INFO[mode as GameMode];
                  const isSelected = selectedMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-400 shadow-md'
                          : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-bold text-amber-200 text-sm">{info.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {info.description}
                      </div>
                      <div className="text-[10px] text-amber-500 font-bold mt-1">
                        Basiswert: {info.baseValue} Pkt
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm button */}
            <div className="flex justify-end gap-3">
              <button
                disabled={selectedDiscards.length !== 3}
                onClick={() => onTalonAction('take_talon', selectedDiscards, selectedMode)}
                className={`px-8 py-3 rounded-xl font-black text-base shadow-lg transition-all ${
                  selectedDiscards.length === 3
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {selectedDiscards.length === 3
                  ? `Spiel starten (${GAME_MODE_INFO[selectedMode as GameMode]?.name})`
                  : `Wähle noch ${3 - selectedDiscards.length} Karte(n) zum Wegdrücken`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
