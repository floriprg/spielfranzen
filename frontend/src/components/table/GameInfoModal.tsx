import { SanitizedGameState } from '@spielfranzen/shared';
import {
  Award,
  BookOpen,
  Check,
  Clock,
  Copy,
  Crown,
  Globe,
  GraduationCap,
  HelpCircle,
  Info,
  Lock,
  MessageSquare,
  RotateCcw,
  Shield,
  Sliders,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface GameInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: SanitizedGameState;
  copiedCode: boolean;
  onCopyCode: () => void;
  onOpenTutorial?: () => void;
}

export const GameInfoModal: React.FC<GameInfoModalProps> = ({
  isOpen,
  onClose,
  gameState,
  copiedCode,
  onCopyCode,
  onOpenTutorial,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'players' | 'rules'>('settings');

  if (!isOpen) return null;

  const {
    code,
    totalRounds,
    currentRound,
    isPrivate,
    timer,
    players,
    status,
    declarerSeat,
  } = gameState;

  const timerConfig = timer?.config;
  const isTimerEnabled = !!timerConfig?.enabled;
  const turnTime = timerConfig?.turnTimeLimit ?? 60;
  const totalBank = timerConfig?.totalTimeBank ?? 300;

  const progressPercent = Math.min(
    100,
    Math.round(((currentRound - (status === 'WAITING' ? 1 : 0)) / totalRounds) * 100),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-300 font-serif-vintage leading-tight">
                {gameState.name || 'Spiel-Informationen & Einstellungen'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Match #{code} • {isPrivate ? 'Privater Raum' : 'Öffentlicher Raum'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-1 gap-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${activeTab === 'settings'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-slate-900'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Einstellungen</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${activeTab === 'players'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-slate-900'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mitspieler ({players.filter((p) => p.userId).length}/{gameState.maxPlayers || 3})</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${activeTab === 'rules'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-slate-900'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Spielregeln</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: EINSTELLUNGEN */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {/* Room Code Card */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    {gameState.name ? `Tisch: ${gameState.name}` : 'Raum-Code'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-amber-300">
                      #{code}
                    </span>
                    <button
                      onClick={onCopyCode}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                      title="Raumcode kopieren"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Kopiert</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopieren</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Sichtbarkeit
                  </span>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-300">
                    {isPrivate ? (
                      <>
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Privat (Nur mit Code)</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-emerald-400" />
                        <span>Öffentlich (In Lobby)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Match Rounds & Progress */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Rundenanzahl & Fortschritt
                  </span>
                  <span className="font-bold text-amber-300">
                    Runde {currentRound} von {totalRounds} ({totalRounds} Runden gesamt)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Timer Settings Card */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Bedenkzeit & Zeitlimit
                  </span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${isTimerEnabled
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                  >
                    {isTimerEnabled ? 'Aktiviert' : 'Deaktiviert (Kein Zeitlimit)'}
                  </span>
                </div>

                {isTimerEnabled ? (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Zugzeit (pro Zug):</div>
                      <div className="font-bold text-slate-200 text-sm mt-0.5">
                        {turnTime} Sekunden
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Match-Zeitbank (gesamt):</div>
                      <div className="font-bold text-slate-200 text-sm mt-0.5">
                        {totalBank}s ({Math.round(totalBank / 60)} Min)
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    In diesem Match gibt es kein Zeitlimit. Du kannst dir für jeden Zug beliebig viel
                    Zeit lassen.
                  </p>
                )}

                {isTimerEnabled && (
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500/80" />
                    Bei Ablauf der Zeit wird automatisch ein zufälliger, regelkonformer Zug ausgeführt.
                  </p>
                )}
              </div>

              {/* Chat Status Card */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-amber-400" />
                    In-Game Chat
                  </span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${gameState.chatEnabled !== false
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                      }`}
                  >
                    {gameState.chatEnabled !== false ? 'Aktiviert' : 'Deaktiviert'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {gameState.chatEnabled !== false
                    ? 'Mitspieler können über den Chat-Button Nachrichten schreiben.'
                    : 'Der Chat wurde vom Host für dieses Match ausgeschaltet.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MITSPIELER */}
          {activeTab === 'players' && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tischbelegung & Punktestand (Nullsummenspiel)
              </span>

              {players.map((p, index) => {
                const isTaken = !!p.userId;
                const isHost = index === 0;
                const isDec = p.seatIndex === declarerSeat;

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border flex items-center justify-between ${p.seatIndex === gameState.mySeatIndex
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-inner'
                      : isTaken
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-slate-950/40 border-dashed border-slate-800/80'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                          <span className="truncate" title={p.username || 'Freier Platz'}>
                            {p.username || 'Freier Platz'}
                          </span>
                          {p.seatIndex === gameState.mySeatIndex && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 flex-shrink-0">
                              Du
                            </span>
                          )}
                          {isHost && (
                            <span title="Host">
                              <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-[10px] text-slate-400 font-normal flex-shrink-0">
                              (Bot)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          {isTaken ? (
                            <>
                              <span>Platz {index + 1}</span>
                              <span>•</span>
                              <span>
                                {isDec ? (
                                  <strong className="text-amber-400">Alleinspieler</strong>
                                ) : (
                                  'Gegenspieler'
                                )}
                              </span>
                              <span>•</span>
                              <span>{p.isOnline ? 'Online' : 'Offline'}</span>
                            </>
                          ) : (
                            <span className="italic text-slate-500">Wartet auf Spieler</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-sm font-black ${p.score > 0
                          ? 'text-emerald-400'
                          : p.score < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                          }`}
                      >
                        {p.score > 0 ? `+${p.score}` : p.score} Pkt
                      </div>
                      <div className="text-[10px] text-slate-500">Stiche: {p.tricksWon}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: REGELN */}
          {activeTab === 'rules' && (
            <div className="space-y-2.5 text-slate-300">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {onOpenTutorial && gameState.gameType === 'franzen' && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTutorial();
                    }}
                    className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Tutorial starten</span>
                  </button>
                )}
                <Link
                  to="/rules"
                  onClick={onClose}
                  className={`p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center ${
                    !onOpenTutorial || gameState.gameType !== 'franzen' ? 'col-span-2' : ''
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ausführliches Regelwerk</span>
                </Link>
              </div>

              {/* WATTEN REGELN */}
              {(gameState.gameType === 'watten_2' || gameState.gameType === 'watten_4') && (
                <>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🎴 Watten: 33-Karten-Blatt & Teams</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Gespielt wird mit 33 Karten (Eichel, Laub, Schell, Herz; 7 bis Ass + Weli).
                      Jeder Spieler erhält 5 Handkarten. {gameState.gameType === 'watten_4' ? 'Spieler 1 & 3 spielen im Team gegen Spieler 2 & 4 (Partner sitzen sich gegenüber).' : '1 gegen 1 Duell.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🗣️ Ansage: Schlag & Farbe</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      <strong>Vorhand</strong> (links vom Geber) sagt den <strong>Schlag</strong> (Rang) an.
                      Danach sagt der <strong>Geber</strong> die <strong>Farbe</strong> (Trumpffarbe) an.
                      Höchste Karte ist der <strong>Rechte</strong> (Schlag in Trumpffarbe), gefolgt vom <strong>Guten</strong> (Schlag + 1 in Trumpffarbe) und den weiteren Schlägen.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🚫 Kein Farb- und Stichzwang!</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Beim Watten gibt es grundsätzlich <strong>weder Farb- noch Stichzwang</strong>!
                      Einzige Ausnahme: Spielt Vorhand im 1. Stich Trumpf aus („Trumpf ausspeiben“), müssen alle anderen Trumpf zugeben (Rechter, Guter und Schläge sind befreit).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🔥 Bieten & Rundenziel (3 Stiche)</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Wer zuerst <strong>3 Stiche</strong> macht, gewinnt die Hand sofort! Jede Hand startet bei 2 Punkten.
                      Vor dem Ausspielen einer Karte kann ein Team <strong>„Schlagen“</strong> (auf 3, 4, 5... erhöhen). Der Gegner kann <strong>Halten</strong>, <strong>Gehen</strong> oder selbst gegen-erhöhen.
                      Match-Ziel: {gameState.wattenState?.targetScore || 15} Punkte.
                    </p>
                  </div>
                </>
              )}

              {/* SCHNAPSEN REGELN */}
              {(gameState.gameType === 'schnapsen_2' || gameState.gameType === 'schnapsen_3' || gameState.gameType === 'schnapsen_4') && (
                <>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🎴 Schnapsen: Blatt & Kartenwerte</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Gespielt wird mit {gameState.gameType === 'schnapsen_3' ? '24 Karten' : '20 Karten'}:
                      <strong> Ass (11)</strong>, <strong>Zehner (10)</strong>, <strong>König (4)</strong>, <strong>Dame/Ober (3)</strong>, <strong>Bube/Unter (2)</strong>.
                      Ziel eines Spiels sind <strong>66 Augen</strong> oder der Gewinn des letzten Stichs.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🔄 Offener Talon vs. Geschlossener Talon</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Solange Karten im Talon liegen, herrscht <strong>kein Farb- und kein Stichzwang</strong>. Nach jedem Stich zieht der Stichgewinner zuerst eine Karte nach.
                      Sobald der Talon aufgebraucht oder <strong>zugedreht</strong> wurde, gilt strenger <strong>Farb-, Stich- und Trumpfzwang</strong>!
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">💍 Ansagen & Spezialaktionen (Am Ausspiel)</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      • <strong>20er / 40er:</strong> König + Dame/Ober derselben Farbe vorzeigen (zählt nur, wenn man mind. einen Stich macht).<br/>
                      • <strong>Trumpf tauschen:</strong> Atout-Bube gegen die offene Trumpfkarte unter dem Talon austauschen.<br/>
                      • <strong>Talon zudrehen:</strong> Talon sperren – wer zudreht, muss 66 Augen erreichen.<br/>
                      • <strong>„Danke genug“:</strong> 66 Augen beanspruchen (erfordert mind. 1 Stich!).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🏆 Bummerl & Wertung</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Es wird von {gameState.gameType === 'schnapsen_2' ? '7 Punkten' : '24 Punkten'} rückwärts bis 0 geschrieben.
                      Bleibt der Verlierer auf der Startpunktzahl stehen, zählt das Bummerl doppelt (<strong>Schneider-Bummerl = 2 Bummerl</strong>).
                    </p>
                  </div>
                </>
              )}

              {/* FRANZEN REGELN */}
              {gameState.gameType === 'franzen' && (
                <>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🎴 Südtiroler Masenghini-Blatt</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Gespielt wird mit 33 Karten (Eichel, Laub, Schell, Herz; 7, 8, 9, 10, Unter, Ober,
                      König, Ass) plus dem <strong>Schell Weli (Schell 6)</strong> als 33. Karte.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🃏 Der Schell Weli</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Die Weli ist das kleinste Schell.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">⚖️ Nullsummenspiel & Augen</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Das Spiel ist streng nullsummiert: Punkte, die der Alleinspieler gewinnt, werden den
                      beiden Gegnern zu gleichen Teilen abgezogen. Bei Farbspielen gewinnt, wer zuerst{' '}
                      <strong>66 Augen</strong> erreicht oder den 10. (letzten) Stich macht.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🗃️ Talon & Gedrückte Karten</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Die 3 vom Alleinspieler abgelegten (gedrückten) Karten scheiden vollständig aus dem Spiel aus
                      und <strong>zählen nicht zu den Punkten</strong>. Für die 66 Augen zählen ausschließlich die in den regulären 10 Stichen gewonnenen Karten!
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="font-bold text-amber-300 mb-1 text-xs">🎯 Farb- und Trumpfzwang</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Es herrscht strikter Farbzwang und Überstechzwang. Kann die angespielte Farbe nicht
                      bedient werden, muss mit Trumpf gestochen werden.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Verstanden & Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
