import { Card, Suit } from '@spielfranzen/shared';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Eye,
  Flame,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CardView } from '../components/cards/CardView.js';
import { SuitIcon } from '../components/cards/SuitIcon.js';
import { InteractiveTutorialModal } from '../components/tutorial/InteractiveTutorialModal.js';
import { getAllCards, SUIT_LABELS, SUITS } from '../utils/tutorialDeck.js';

export const RulesPage: React.FC = () => {
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [activeFilterSuit, setActiveFilterSuit] = useState<Suit | 'ALL'>('ALL');
  const [activeTabSection, setActiveTabSection] = useState<string>('overview');

  const allCards = getAllCards();
  const displayedCards =
    activeFilterSuit === 'ALL'
      ? allCards
      : allCards.filter((c) => c.suit === activeFilterSuit);

  const sections = [
    { id: 'overview', title: 'Überblick & Ziel', icon: Compass },
    { id: 'deck', title: 'Das 33-Karten-Blatt', icon: Sparkles },
    { id: 'bidding', title: 'Ablauf & Bieten', icon: Swords },
    { id: 'modes', title: 'Die 9 Spielmodi', icon: Trophy },
    { id: 'tricks', title: 'Stechregeln', icon: Shield },
    { id: 'scoring', title: '66 Augen & Wertung', icon: Target },
    { id: 'tactics', title: 'Meister-Taktiken', icon: Flame },
    { id: 'faq', title: 'Häufige Fragen (FAQ)', icon: HelpCircle },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/70 border-2 border-amber-500/60 p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 select-none pointer-events-none font-serif-vintage">
          🂡
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-3">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Offizielles Regelwerk & Strategiehandbuch</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif-vintage bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 bg-clip-text text-transparent leading-tight">
              Franzen Spielanleitung
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mt-2 leading-relaxed">
              Alles über das traditionelle 3-Personen-Kartenspiel aus dem Südtiroler und Tiroler
              Alpenraum. Lerne das 33-Karten-Blatt, die Lizitation, die Stechregeln und die geheimen
              Verteidiger-Taktiken.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowTutorial(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Interaktive Anleitung starten</span>
            </button>

            <Link
              to="/lobby"
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zur Lobby</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Table of Contents Pill Bar */}
      <div className="sticky top-14 z-30 bg-slate-950/95 backdrop-blur-md p-2 rounded-2xl border border-amber-500/30 shadow-lg overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActiveTabSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTabSection === s.id
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{s.title}</span>
            </a>
          );
        })}
      </div>

      {/* SECTION 1: ÜBERBLICK & GRUNDIDEE */}
      <section
        id="overview"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              1. Überblick & Grundidee
            </h2>
            <p className="text-xs text-slate-400">Das Prinzip: 1 Alleinspieler gegen 2 Verteidiger</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>3 Spieler am Tisch</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Franzen wird zwingend mit genau 3 Spielern gespielt. Jeder spielt beim Bieten für sich
              selbst, doch im Spiel kämpft der <strong>Alleinspieler</strong> gegen die zwei{' '}
              <strong>Verteidiger</strong>, die als stillschweigendes Team zusammenarbeiten.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              <span>Nullsummenspiel</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Gewinnt der Alleinspieler sein Spiel, zahlen ihm <strong>beide Verteidiger</strong> den
              vollen Spielwert. Verliert der Alleinspieler, zahlt er an <strong>jeden</strong> der
              beiden Verteidiger!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>Ziel: 66 Augen</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bei den Farbspielen (Eichel, Laub, Schell, Herz) gewinnt die Partei, die als Erste{' '}
              <strong>66 von 120 Augen</strong> im Spiel erreicht. Dies beendet die Runde sofort!
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: DAS 33-KARTEN-BLATT & AUGENWERTE */}
      <section
        id="deck"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
                2. Das 33-Karten-Blatt & Augenwerte
              </h2>
              <p className="text-xs text-slate-400">
                Traditionelle Salzburger Karten mit 120 Augen insgesamt
              </p>
            </div>
          </div>

          {/* Suit Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap">
            <button
              onClick={() => setActiveFilterSuit('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeFilterSuit === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Alle (33)
            </button>
            {SUITS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveFilterSuit(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${activeFilterSuit === s
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <SuitIcon suit={s} size={14} />
                <span className="capitalize">{s.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Value Table & Weli Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Rangfolge & Augenwert pro Farbe (absteigend geordnet):
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-2.5">Karte</th>
                    <th className="p-2.5">Kürzel</th>
                    <th className="p-2.5">Rang</th>
                    <th className="p-2.5">Augenwert</th>
                    <th className="p-2.5">Bedeutung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr className="hover:bg-slate-950/40">
                    <td className="p-2.5 font-bold text-amber-200">Ass (Daus)</td>
                    <td className="p-2.5 font-mono text-amber-400 font-bold">A</td>
                    <td className="p-2.5">9 (Höchste)</td>
                    <td className="p-2.5 font-bold text-emerald-400">11 Augen</td>
                    <td className="p-2.5 text-slate-400">Stärkste Karte der Farbe, wichtig zum Schmieren</td>
                  </tr>
                  <tr className="hover:bg-slate-950/40">
                    <td className="p-2.5 font-bold text-amber-200">10er</td>
                    <td className="p-2.5 font-mono text-amber-400 font-bold">10</td>
                    <td className="p-2.5">8</td>
                    <td className="p-2.5 font-bold text-emerald-400">10 Augen</td>
                    <td className="p-2.5 text-slate-400">Zweithöchste Karte! Steht ÜBER König/Ober/Unter</td>
                  </tr>
                  <tr className="hover:bg-slate-950/40">
                    <td className="p-2.5 font-semibold">König</td>
                    <td className="p-2.5 font-mono">K</td>
                    <td className="p-2.5">7</td>
                    <td className="p-2.5">4 Augen</td>
                    <td className="p-2.5 text-slate-400">Solide Bildkarte</td>
                  </tr>
                  <tr className="hover:bg-slate-950/40">
                    <td className="p-2.5 font-semibold">Ober</td>
                    <td className="p-2.5 font-mono">O</td>
                    <td className="p-2.5">6</td>
                    <td className="p-2.5">3 Augen</td>
                    <td className="p-2.5 text-slate-400">Bildkarte</td>
                  </tr>
                  <tr className="hover:bg-slate-950/40">
                    <td className="p-2.5 font-semibold">Unter</td>
                    <td className="p-2.5 font-mono">U</td>
                    <td className="p-2.5">5</td>
                    <td className="p-2.5">2 Augen</td>
                    <td className="p-2.5 text-slate-400">Bildkarte</td>
                  </tr>
                  <tr className="hover:bg-slate-950/40">
                    <td className="p-2.5 text-slate-400">9er, 8er, 7er</td>
                    <td className="p-2.5 font-mono text-slate-400">9, 8, 7</td>
                    <td className="p-2.5 text-slate-400">4, 3, 2</td>
                    <td className="p-2.5 font-bold text-slate-400">0 Augen</td>
                    <td className="p-2.5 text-slate-400">
                      "Faule Nullen" – perfekt zum Wimmeln oder für Bettl
                    </td>
                  </tr>
                  <tr className="bg-amber-950/30 hover:bg-amber-950/40 border-t-2 border-amber-500/40">
                    <td className="p-2.5 font-bold text-yellow-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Schell Weli (Schell 6)</span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-yellow-300">W</td>
                    <td className="p-2.5 text-yellow-400 font-bold">1 (Niedrigste)</td>
                    <td className="p-2.5 font-bold text-slate-400">0 Augen</td>
                    <td className="p-2.5 text-yellow-200">
                      33. Karte! Kleinster Trumpf im Schellspiel (unter der 7).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mathematical Eye Total Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/40 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Augen-Mathematik
              </span>
              <h4 className="text-xl font-bold font-serif-vintage text-amber-200">
                120 Augen im Deck
              </h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Jede Farbe enthält genau <strong>30 Augen</strong>:
                <br />
                11 (Ass) + 10 (10er) + 4 (König) + 3 (Ober) + 2 (Unter) = <strong>30 Augen</strong>.
                <br />
                4 Farben × 30 = <strong>120 Augen</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30">
              <div className="text-xs font-bold text-amber-300 mb-1">Die 66-Augen-Schwelle:</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                60 ist genau die Hälfte. Wer <strong>66 Augen</strong> erreicht, hat die unanfechtbare
                Mehrheit und gewinnt die Runde sofort!
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Card Gallery */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Kartenübersicht ({displayedCards.length} Karten angezeigt):
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
            {displayedCards.map((card) => (
              <div key={card.id} className="flex flex-col items-center">
                <CardView card={card} size="xs" showPoints={true} />
                <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-full">
                  {card.shortName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: ABLAUF & BIETEN */}
      <section
        id="bidding"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              3. Spielablauf & Bieten (Lizitation)
            </h2>
            <p className="text-xs text-slate-400">Das Vorhand-Halte-Prinzip & die Verteilung</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-sm font-bold text-amber-200">Geben</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Jeder der 3 Spieler erhält <strong>10 Handkarten</strong>. Genau{' '}
              <strong>3 Karten</strong> wandern verdeckt in die Mitte als <strong>Talon</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-sm font-bold text-amber-200">Bieten (Lizitieren)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Im Uhrzeigersinn wird geboten. Man steigt mit Stufe 4 ("Ich spiele") ein und kann auf
              höhere Stufen (5 bis 12) steigern.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-sm font-bold text-amber-200">Talon & Drücken</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Der Höchstbietende gewinnt das Spiel, nimmt den Talon auf und{' '}
              <strong>drückt 3 Karten</strong>. Wichtig: Die abgelegten Karten scheiden aus und{' '}
              <strong>zählen nicht zu den Punkten</strong>! Danach sagt er die Trumpffarbe an.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
              4
            </div>
            <h4 className="text-sm font-bold text-amber-200">Stichspiel</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              10 Stiche werden gespielt. Es gelten strikter Farbzwang und Trumpfzwang.
            </p>
          </div>
        </div>

        {/* Deep Dive Vorhand */}
        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Das Vorhand-Halte-Prinzip (Historische Besonderheit)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Als <strong>Vorhand</strong> bezeichnet man den Spieler links vom Geber, der als Erster am
            Zug ist. Die Vorhand hat ein gewaltiges Vorrecht: Sagt ein späterer Spieler ein Gebot
            an (z. B. "5"), muss die Vorhand <em>nicht</em> höher bieten, sondern kann einfach{' '}
            <strong>"Halten!"</strong> rufen. Die Vorhand erhält bei Punktegleichheit immer den
            Zuschlag!
          </p>
        </div>
      </section>

      {/* SECTION 4: DIE 9 SPIELMODI */}
      <section
        id="modes"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              4. Die Spielmodi (4 bis 12)
            </h2>
            <p className="text-xs text-slate-400">
              Von einfachen Farbenspielen bis zum legendären Doppelmord
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mode 4 */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-amber-400">Stufe 4</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                100 Pkt
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-100">"Ich spiele"</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Einstiegsgebot beim Bieten. Verpflichtet den Alleinspieler, mindestens ein reguläres
              Farbspiel (Stufe 5 bis 8) anzusagen.
            </p>
          </div>

          {/* Mode 5-8: Color Games */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-amber-400">Stufen 5, 6, 7, 8</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                100 Pkt
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-100">
              Die Farbspiele: Eichel (5), Laub (6), Schell (7), Herz (8)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Klassisches Spiel mit Trumpf. Der Alleinspieler darf den Talon aufnehmen und 3 Karten
              drücken. Ziel: <strong>66 Augen</strong> oder der <strong>10. Stich</strong>.
              <br />
              <strong className="text-amber-400">Besonderheit Schell:</strong> Der Schell Weli ist
              der kleinste Trumpf beim Schell-Spiel(7)!
            </p>
          </div>

          {/* Mode 9: Bettl */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-rose-400">Stufe 9</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                200 Pkt
              </span>
            </div>
            <h4 className="text-sm font-bold text-rose-200">Bettl</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Kein Trumpf.</strong> Der Alleinspieler darf den Talon aufnehmen und 3 Karten
              drücken.
              <br />
              <strong>Ziel:</strong> Exakt <strong>0 Stiche</strong>! Macht der Alleinspieler auch nur
              einen Stich, ist das Spiel sofort verloren.
            </p>
          </div>

          {/* Mode 10: Mord */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-purple-400">Stufe 10</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                300 Pkt
              </span>
            </div>
            <h4 className="text-sm font-bold text-purple-200">Mord (Durchmarsch)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Kein Trumpf.</strong> Der Alleinspieler darf den Talon aufnehmen und 3 Karten
              drücken.
              <br />
              <strong>Ziel:</strong> Alle <strong>10 Stiche</strong> gewinnen! Verliert er einen
              einzigen Stich, ist die Runde sofort verloren.
            </p>
          </div>

          {/* Mode 11: Doppelbettl */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-rose-600/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-rose-400">Stufe 11</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-200 border border-rose-500/40">
                400 Pkt
              </span>
            </div>
            <h4 className="text-sm font-bold text-rose-200">Doppelbettl (Hand-Bettl)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wie Bettl, aber <strong>OHNE Talon!</strong> Der Alleinspieler spielt direkt aus der
              Hand. 0 Stiche erforderlich. Extrem hohes Risiko, enorme Belohnung.
            </p>
          </div>

          {/* Mode 12: Doppelmord */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-400/80 space-y-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-yellow-300">Stufe 12 (Königsdisziplin)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                600 Pkt
              </span>
            </div>
            <h4 className="text-base font-bold text-yellow-200">Doppelmord (Hand-Mord)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Das höchste Gebot im Franzen! <strong>Kein Trumpf, KEIN Talon!</strong> Der Alleinspieler
              muss alle 10 Stiche direkt aus seiner ausgeteilten Hand machen. Der ultimative
              Triumph am Kartentisch.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: STECHREGELN */}
      <section
        id="tricks"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              5. Stechregeln: Farbzwang & Trumpfzwang
            </h2>
            <p className="text-xs text-slate-400">
              Die eiserne Gesetze jedes Stiches im Franzen
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
            <div className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>1. Farbzwang (Zwingend)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Die zuerst angespielte Farbe eines Stiches <strong>muss bedient werden</strong>. Wer
              mindestens eine Karte der angespielten Farbe besitzt, MUSS sie legen – unabhängig davon,
              ob sie höher oder niedriger ist.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
            <div className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>2. Trumpfzwang (In Farbspielen)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wer die angespielte Farbe <strong>nicht</strong> besitzt, <strong>muss</strong> im
              Farbspiel (Stufen 5 bis 8) einen Trumpf spielen, sofern er mindestens einen Trumpf auf
              der Hand hat!
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-slate-300 font-bold text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>3. Kein Stechzwang</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Es gibt <strong>keinen Stichzwang</strong> innerhalb der Farbe: Liegt z. B. der Herz König,
              darfst du auch die Herz 7 legen, selbst wenn du das Herz Ass auf der Hand hältst!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <strong className="text-amber-300">Freies Abwerfen (Wimmeln/Schmieren):</strong> Wer weder
          die angespielte Farbe noch einen Trumpf besitzt (oder in Bettl/Mord ohne Trumpf spielt), darf
          eine <strong>völlig beliebige Karte</strong> abwerfen!
        </div>
      </section>

      {/* SECTION 6: 66 AUGEN & WERTUNG */}
      <section
        id="scoring"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              6. Spielziel, 66 Augen & Wertung
            </h2>
            <p className="text-xs text-slate-400">
              Sofortsieg, 10.-Stich-Regel und Punkteabrechnung
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
            <h3 className="font-bold text-base text-amber-200">Die zwei Siegwege im Farbspiel</h3>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-emerald-400 block mb-1">
                  Weg 1: 66-Augen-Sofortsieg
                </strong>
                Sobald der Alleinspieler (oder die Verteidiger) im Laufe des Spiels{' '}
                <strong>66 Augen</strong> in seinen Stichen gesammelt hat, gewinnt er augenblicklich!
                Die Runde wird sofort abgebrochen.
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-amber-400 block mb-1">Weg 2: Der 10. Stich</strong>
                Werden alle 10 Stiche zu Ende gespielt, ohne dass eine Partei 66 Augen meldet, gewinnt
                diejenige Partei, die den <strong>10. (letzten) Stich</strong> macht – unabhängig von
                den Augen!
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="font-bold text-base text-slate-100">Abrechnung (Punkteverteilung)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nach jeder Runde werden die Punkte im Match-Konto verbucht:
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <strong className="text-emerald-300">Alleinspieler gewinnt:</strong> Er erhält den
                vollen Spielwert (z. B. +100 Pkt) von Spieler A und von Spieler B.
                <br />
                <span className="text-[11px] text-slate-400">
                  Ergebnis: Alleinspieler +200, Verteidiger je -100.
                </span>
              </li>
              <li className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30">
                <strong className="text-rose-300">Alleinspieler verliert:</strong> Er zahlt an beide
                Verteidiger den vollen Spielwert.
                <br />
                <span className="text-[11px] text-slate-400">
                  Ergebnis: Alleinspieler -200, Verteidiger je +100.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 7: PROFI-TAKTIKEN & STRATEGIEN */}
      <section
        id="tactics"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              7. Meister-Taktiken & Strategien
            </h2>
            <p className="text-xs text-slate-400">
              Wie die besten Franzen-Spieler und KIs die Partie entscheiden
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tactic 1: Schmieren */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Award className="w-4 h-4 text-amber-400" />
              <span>1. Schmieren (Schmieren heißt Gewinnen!)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wenn dein Mitverteidiger mit einer hohen Karte (z. B. dem Trumpf Ass) im Stich liegt und
              der Alleinspieler nicht mehr überstechen kann: <strong>Schmiere gnadenlos!</strong> Wirf
              dein Ass (11) oder deine 10er (10) hinein. Oft entscheidet ein einziger 21-Augen-Stich
              über die 66er-Marke.
            </p>
          </div>

          {/* Tactic 2: Wimmeln */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>2. Wimmeln (Ducking)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Macht der Alleinspieler sicher den Stich? Behalte deine Punkte um jeden Preis! Wirf
              ausschließlich wertlose <strong>7er, 8er oder 9er (0 Augen)</strong> ab. Jeder vermiedene
              Punkt zwingt den Alleinspieler, tiefer in die Stiche zu gehen.
            </p>
          </div>

          {/* Tactic 3: Das Bettl-Klippen-Theorem */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <Zap className="w-4 h-4 text-rose-400" />
              <span>3. Das 8er/9er-Klippen-Theorem im Bettl</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ein Bettl-Spieler glaubt oft, mit 8ern und 9ern sicher zu sein. Weit gefehlt! Haben die
              Verteidiger die <strong>7er</strong>, spielen sie diese gezielt aus. Der Bettl-Spieler
              unterliegt dem Farbzwang und muss stechen – K.O.!
            </p>
          </div>

          {/* Tactic 4: Die Vakuum-Trap */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>4. Die Vakuum-Trap (Trumpf ziehen)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Als Alleinspieler mit vielen Trümpfen: Spiele sofort 1–2 hohe Trümpfe aus! Dadurch nimmst
              du den Verteidigern ihre Trümpfe ab, bevor diese später deine ungeschützten Asse in den
              Nebensortierungen stechen können.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ */}
      <section
        id="faq"
        className="scroll-mt-32 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-vintage text-amber-300">
              8. Häufig gestellte Fragen (FAQ)
            </h2>
            <p className="text-xs text-slate-400">Kurze Antworten auf typische Spielsituationen</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <h4 className="text-sm font-bold text-amber-300 mb-1">
              Zählen die vom Alleinspieler gedrückten Talon-Karten zu den 66 Augen?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Nein, keinesfalls!</strong> Die 3 vom Alleinspieler abgelegten (gedrückten)
              Karten scheiden vollständig aus dem Spiel aus (0 Punkte). Sie bringen dem Alleinspieler
              keine Augen. Für das 66-Augen-Ziel zählen einzig und allein die in den regulären 10
              Stichen gewonnenen Karten!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <h4 className="text-sm font-bold text-amber-300 mb-1">
              Was passiert, wenn alle 3 Spieler beim Bieten passen?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wenn niemand bereit ist, mindestens Stufe 4 zu spielen, wird die Runde annulliert. Die
              Karten werden zusammengeworfen, neu gemischt und der Geber wechselt im Uhrzeigersinn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <h4 className="text-sm font-bold text-amber-300 mb-1">
              Kann der Schell Weli auch im Eichel-, Laub- oder Herz-Spiel stechen?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Nein.</strong> Der Schell Weli ist ausschließlich im <strong>Schellenspiel</strong>{' '}
              der kleinste Trumpf. In anderen Farbspielen ist er eine reguläre Schell-Karte vom Rang 1
              mit 0 Augen.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div>
          <h3 className="text-2xl font-black font-serif-vintage">Bereit für dein erstes Spiel?</h3>
          <p className="text-sm text-slate-900 font-medium mt-1">
            Teste dein Wissen jetzt an einem echten Tisch oder trainiere gegen unsere KI-Bots!
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowTutorial(true)}
            className="px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold text-sm shadow transition-all cursor-pointer"
          >
            Interaktives Tutorial
          </button>
          <Link
            to="/lobby"
            className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-sm shadow-xl transition-all"
          >
            Zur Spiel-Lobby →
          </Link>
        </div>
      </div>

      {/* Interactive Tutorial Modal */}
      <InteractiveTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};
