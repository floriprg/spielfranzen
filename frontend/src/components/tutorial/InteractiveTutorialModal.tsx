import { Card, Suit } from '@spielfranzen/shared';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  HelpCircle,
  Lightbulb,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CardView } from '../cards/CardView.js';
import { SuitIcon } from '../cards/SuitIcon.js';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  // Step 0 State: Inspected card
  const [selectedCardId, setSelectedCardId] = useState<string>('HERZ_9');

  // Step 1 State: Bidding interactive simulation
  const [biddingAction, setBiddingAction] = useState<'hold' | 'raise' | 'pass' | null>(null);

  // Step 2 State: Talon discard interactive
  const [discardedIds, setDiscardedIds] = useState<string[]>(['EICHEL_2', 'LAUB_2']);
  const [selectedTrump, setSelectedTrump] = useState<Suit>('HERZ');

  // Step 3 State: Trick puzzle
  const [puzzlePlayedCard, setPuzzlePlayedCard] = useState<string | null>(null);
  const [puzzleFeedback, setPuzzleFeedback] = useState<{ success: boolean; message: string } | null>(
    null,
  );

  // Step 5 State: Tactic simulation
  const [tacticChoice, setTacticChoice] = useState<'smear' | 'duck' | null>(null);

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('franzen_tutorial_completed', 'true');
    }
    if (onComplete) onComplete();
    onClose();
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Step 0 Sample Hand
  const step0Cards: Card[] = [
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'HERZ_8', suit: 'HERZ', rank: 8, points: 10, name: 'Herz 10er', shortName: '10' },
    { id: 'HERZ_7', suit: 'HERZ', rank: 7, points: 4, name: 'Herz König', shortName: 'K' },
    { id: 'EICHEL_6', suit: 'EICHEL', rank: 6, points: 3, name: 'Eichel Ober', shortName: 'O' },
    { id: 'LAUB_5', suit: 'LAUB', rank: 5, points: 2, name: 'Laub Unter', shortName: 'U' },
    { id: 'LAUB_4', suit: 'LAUB', rank: 4, points: 0, name: 'Laub 9er', shortName: '9' },
    { id: 'SCHELL_2', suit: 'SCHELL', rank: 2, points: 0, name: 'Schell 7er', shortName: '7' },
    { id: 'SCHELL_WELI', suit: 'SCHELL', rank: 1, points: 0, name: 'Schell Weli', shortName: 'W' },
  ];
  const activeCard = step0Cards.find((c) => c.id === selectedCardId) || step0Cards[0]!;

  // Step 2 Sample Talon pool (6 cards: choose 3)
  const step2Pool: Card[] = [
    { id: 'HERZ_9', suit: 'HERZ', rank: 9, points: 11, name: 'Herz Ass', shortName: 'A' },
    { id: 'HERZ_8', suit: 'HERZ', rank: 8, points: 10, name: 'Herz 10er', shortName: '10' },
    { id: 'EICHEL_2', suit: 'EICHEL', rank: 2, points: 0, name: 'Eichel 7er', shortName: '7' },
    { id: 'LAUB_2', suit: 'LAUB', rank: 2, points: 0, name: 'Laub 7er', shortName: '7' },
    { id: 'SCHELL_8', suit: 'SCHELL', rank: 8, points: 10, name: 'Schell 10er', shortName: '10' },
    { id: 'SCHELL_WELI', suit: 'SCHELL', rank: 1, points: 0, name: 'Schell Weli', shortName: 'W' },
  ];

  const toggleDiscard = (id: string) => {
    if (discardedIds.includes(id)) {
      setDiscardedIds(discardedIds.filter((x) => x !== id));
    } else {
      if (discardedIds.length < 3) {
        setDiscardedIds([...discardedIds, id]);
      }
    }
  };

  // Step 3 Puzzle Cards
  const puzzleLeadCard: Card = {
    id: 'HERZ_7',
    suit: 'HERZ',
    rank: 7,
    points: 4,
    name: 'Herz König',
    shortName: 'K',
  };
  const puzzleHand: Card[] = [
    { id: 'HERZ_2', suit: 'HERZ', rank: 2, points: 0, name: 'Herz 7er', shortName: '7' },
    { id: 'EICHEL_9', suit: 'EICHEL', rank: 9, points: 11, name: 'Eichel Ass', shortName: 'A' },
    { id: 'LAUB_8', suit: 'LAUB', rank: 8, points: 10, name: 'Laub 10er', shortName: '10' },
  ];

  const handlePuzzleCardClick = (c: Card) => {
    setPuzzlePlayedCard(c.id);
    if (c.suit === 'HERZ') {
      setPuzzleFeedback({
        success: true,
        message:
          '✅ Hervorragend! Farbzwang erfüllt. Da du eine Herz-Karte auf der Hand hast, MUSST du Herz bedienen – selbst wenn es nur die kleine 7 ist!',
      });
    } else {
      setPuzzleFeedback({
        success: false,
        message:
          '❌ Regelverstoß! Farbzwang verletzt. Du besitzt noch die Herz 7 auf der Hand und MUSST die angespielte Farbe Herz bedienen!',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/50 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow">
              🂡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-amber-300 font-serif-vintage leading-tight">
                  Interaktive Franzen-Spielanleitung
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Schritt {currentStep + 1} von {totalSteps}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lerne die traditionellen Tiroler Spielregeln in 2 Minuten!
              </p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Schließen & Überspringen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-950 h-1.5">
          <div
            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 0: DAS BLATT & DIE 33 KARTEN */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>1. Das Blatt & die 33 Karten</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Franzen wird mit <strong>33 traditionellen Karten</strong> (Salzburger Karten) gespielt. Es gibt 4 Farben: <strong>Eichel, Laub, Schell, Herz</strong>.
                  Jede Farbe hat 8 Karten (Ass, 10, König, Ober, Unter, 9, 8, 7) plus die 33. Karte:
                  den legendären <strong>Schell Weli (Schell 6)</strong>!
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Klicke auf eine Karte, um ihren Augenwert & Rang zu prüfen:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {step0Cards.map((card) => (
                    <CardView
                      key={card.id}
                      card={card}
                      isSelected={card.id === selectedCardId}
                      onClick={() => setSelectedCardId(card.id)}
                      size="sm"
                    />
                  ))}
                </div>
              </div>

              {/* Inspected card detail card */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CardView card={activeCard} size="xs" showPoints={false} />
                  <div>
                    <h5 className="font-bold text-sm text-amber-200">{activeCard.name}</h5>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {activeCard.id === 'SCHELL_WELI' ? (
                        <>
                          <strong className="text-yellow-400">Schell Weli:</strong> Kleinster Trumpf
                          im Schellenspiel (unter der 7). 0 Augen.
                        </>
                      ) : activeCard.rank === 9 ? (
                        <>
                          <strong className="text-emerald-400">Ass (Daus):</strong> Höchste Karte
                          der Farbe. Bringt satte <strong>11 Augen</strong>!
                        </>
                      ) : activeCard.rank === 8 ? (
                        <>
                          <strong className="text-emerald-400">10er:</strong> Zweithöchste Karte!
                          Bringt wertvolle <strong>10 Augen</strong>.
                        </>
                      ) : activeCard.rank === 7 ? (
                        <>König: 4 Augen.</>
                      ) : activeCard.rank === 6 ? (
                        <>Ober: 3 Augen.</>
                      ) : activeCard.rank === 5 ? (
                        <>Unter: 2 Augen.</>
                      ) : (
                        <>
                          {activeCard.shortName}er: <strong>0 Augen</strong> (wichtig zum
                          Wimmeln!).
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Augenwert
                  </span>
                  <span className="text-lg font-black text-amber-400">
                    {activeCard.points} {activeCard.points === 1 ? 'Auge' : 'Augen'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: DAS BIETEN & VORHAND-HALTE-PRINZIP */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span>2. Das Bieten (Lizitation) & Vorhand-Prinzip</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Zu Beginn bietet jeder um das Recht, Alleinspieler zu werden. Es geht von Stufe{' '}
                  <strong>4 ("Ich spiele")</strong> über die Farbspiele (5 Eichel, 6 Laub, 7 Schell,
                  8 Herz) bis zu Sonderverträgen (9 Bettl, 10 Mord).
                  <br />
                  <strong className="text-amber-300">Goldene Regel:</strong> Der Spieler, der als
                  Erster an der Reihe ist (<strong>Vorhand</strong>), darf bei gleichem Gebot{' '}
                  <strong>"Halten"</strong> und behält das Vorrecht!
                </p>
              </div>

              {/* Interactive Bidding Sandbox */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="text-xs text-slate-300">
                  <span className="text-amber-400 font-bold">Interaktive Situation:</span> Der Spieler
                  vor dir hat <strong>"5 (Eichel)"</strong> angesagt. Du sitzt auf der Vorhand. Was
                  tust du?
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setBiddingAction('pass')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${biddingAction === 'pass'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                  >
                    🚫 Passen
                  </button>
                  <button
                    onClick={() => setBiddingAction('hold')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${biddingAction === 'hold'
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-amber-300'
                      }`}
                  >
                    👑 Halten: "5 (Eichel)"
                  </button>
                  <button
                    onClick={() => setBiddingAction('raise')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${biddingAction === 'raise'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                  >
                    ⚡ Erhöhen: "6 (Laub)"
                  </button>
                </div>

                {biddingAction === 'hold' && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 animate-in fade-in">
                    🎯 <strong>Perfekt!</strong> Weil du Vorhand bist, gewinnst du mit "Halten" den
                    Zuschlag für Stufe 5, ohne selbst höher bieten zu müssen!
                  </div>
                )}
                {biddingAction === 'raise' && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 animate-in fade-in">
                    🔥 <strong>Stark!</strong> Du erhöhst auf Laub (6) und überbietest damit die 5.
                    Dein Gegner muss nun überlegen, ob er noch höher gehen will.
                  </div>
                )}
                {biddingAction === 'pass' && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 animate-in fade-in">
                    💤 <strong>Gepasst:</strong> Du steigst aus dem Bieten aus und wirst in dieser
                    Runde Verteidiger im 2er-Team gegen den Alleinspieler.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: DER TALON & DRÜCKEN */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>3. Der Talon & 3 Karten drücken</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wer das Bieten gewinnt, wird <strong>Alleinspieler</strong> und darf bei
                  Farbspielen die <strong>3 verdeckten Talon-Karten</strong> aufnehmen. Anschließend
                  legt er exakt <strong>3 Karten verdeckt ab</strong> (drücken).
                  <br />
                  <span className="text-amber-300 font-semibold">
                    ⚠️ Wichtig: Die 3 abgelegten Karten zählen <strong>NICHT</strong> zu den Punkten! Sie scheiden mit 0 Punkten aus.
                    Drücke daher gefährliche Fehlfarben weg, um dein Blatt optimal aufzustellen!
                  </span>
                </p>
              </div>

              {/* Interactive Talon Discard */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">
                    Wähle 3 Karten zum Ablegen ({discardedIds.length}/3 gewählt):
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    (Gedrückte Karten zählen 0 Punkte)
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {step2Pool.map((c) => {
                    const isDisc = discardedIds.includes(c.id);
                    return (
                      <div key={c.id} className="relative cursor-pointer" onClick={() => toggleDiscard(c.id)}>
                        <CardView card={c} isSelected={isDisc} size="sm" />
                        {isDisc && (
                          <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center font-black text-[9px] shadow">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Trumpffarbe wählen:</span>
                  <div className="flex items-center gap-1.5">
                    {(['EICHEL', 'LAUB', 'SCHELL', 'HERZ'] as Suit[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedTrump(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${selectedTrump === s
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                      >
                        <SuitIcon suit={s} size={14} />
                        <span className="capitalize">{s.toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FARBZWANG & TRUMPFZWANG (PUZZLE) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>4. Stechregeln: Farbzwang & Trumpfzwang</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Beim Franzen gelten <strong>zwei strenge Grundregeln</strong>:
                  <br />
                  1. <strong>Farbzwang:</strong> Du musst die angespielte Farbe immer bedienen, wenn
                  du mindestens eine Karte dieser Farbe besitzt!
                  <br />
                  2. <strong>Trumpfzwang:</strong> Fehlt dir die angespielte Farbe, MUSST du mit
                  Trumpf stechen (sofern du Trumpf hast).
                </p>
              </div>

              {/* Live Puzzle */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">
                    Trumpffarbe ist: <strong className="text-amber-400">Eichel</strong>
                  </span>
                  <span className="text-slate-400">
                    Ausgespielt wurde: <strong className="text-rose-400">Herz</strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Liegt auf dem Tisch
                    </span>
                    <CardView card={puzzleLeadCard} size="sm" isLegal={true} />
                  </div>

                  <div className="text-center sm:text-left flex-1">
                    <span className="text-xs font-bold text-amber-200 block mb-1">
                      Welche Karte darfst du regelkonform spielen?
                    </span>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Klicke auf deine Handkarte, um den Zug zu testen:
                    </p>
                    <div className="flex items-center gap-2">
                      {puzzleHand.map((c) => (
                        <CardView
                          key={c.id}
                          card={c}
                          size="sm"
                          isSelected={puzzlePlayedCard === c.id}
                          onClick={() => handlePuzzleCardClick(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {puzzleFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium animate-in fade-in ${puzzleFeedback.success
                        ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                        : 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
                      }`}
                  >
                    {puzzleFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: 66 AUGEN & BETTL */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>5. Spielziel: 66 Augen oder 10. Stich</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Im Deck gibt es insgesamt <strong>120 Augen</strong>. Bei normalen Farbspielen gilt:
                  Sobald ein Team mindestens <strong>66 Augen</strong> erreicht, ist das Spiel{' '}
                  <strong className="text-emerald-400">sofort gewonnen</strong>!
                  <br />
                  Wird bis zum 10. Stich gespielt, ohne dass 66 Augen fallen, gewinnt das Team, das den{' '}
                  <strong>10. (letzten) Stich</strong> macht!
                </p>
              </div>

              {/* Progress visualizer */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">66-Augen-Zielanzeige</span>
                  <span className="text-amber-400">66 / 120 Augen</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden relative">
                  <div
                    className="bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-400 h-full rounded-full"
                    style={{ width: `${(66 / 120) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                    style={{ left: `${(66 / 120) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0 Augen</span>
                  <span className="text-amber-400 font-bold">Ziel: 66 Augen</span>
                  <span>120 Augen</span>
                </div>
              </div>

              {/* Bettl Warning Card */}
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-600/40 space-y-1.5">
                <h5 className="font-bold text-sm text-rose-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-rose-400" />
                  <span>Besonderheit: Bettl (Modus 9 & 11)</span>
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Beim <strong>Bettl</strong> spielt der Alleinspieler ohne Trumpf und darf{' '}
                  <strong>KEINEN EINZIGEN Stich</strong> machen. Macht er auch nur einen Stich, ist
                  die Runde <strong className="text-rose-400">sofort verloren</strong>!
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: MEISTER-TAKTIKEN: SCHMIEREN & WIMMELN */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>6. Meister-Taktiken: Schmieren & Wimmeln</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Die beiden Verteidiger spielen als <strong>stillschweigendes Team</strong> gegen
                  den Alleinspieler. Durch geschicktes Abwerfen entscheiden sie die Partie:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setTacticChoice('smear')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${tacticChoice === 'smear'
                      ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400'
                      : 'bg-slate-950 border-slate-800 hover:border-amber-500/40'
                    }`}
                >
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Schmieren</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Hat dein Partner den Stich sicher (z. B. mit Trumpf Ass)? Dann lege deine höchste
                    Karte (Ass = 11 oder 10er = 10) hinein, um eurem Team sofort fette Punkte zu
                    schenken!
                  </p>
                </div>

                <div
                  onClick={() => setTacticChoice('duck')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${tacticChoice === 'duck'
                      ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400'
                      : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40'
                    }`}
                >
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Wimmeln (Ducking)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Geht der Stich an den Alleinspieler? Wirf eine <strong>Null (7, 8 oder 9)</strong>{' '}
                    ab, damit der Alleinspieler keine wertvollen Augen stiehlt!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-sm text-amber-200">Du bist startklar für Franzen!</h5>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Willst du alle 9 Spielmodi, mathematische Feinheiten und Bettl-Klippen vertiefen?
                  </p>
                </div>
                <Link
                  to="/rules"
                  onClick={handleFinish}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all whitespace-nowrap"
                >
                  Regelseite öffnen ↗
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <span>Nicht mehr automatisch beim Start anzeigen</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 text-xs font-black shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{currentStep === totalSteps - 1 ? 'Verstanden & Loslegen!' : 'Weiter'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
