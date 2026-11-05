import { GAME_TYPE_CONFIGS, GameType, MatchListItem } from '@spielfranzen/shared';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Clock,
  Crown,
  Flame,
  Gamepad2,
  GraduationCap,
  Key,
  Lock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { InteractiveTutorialModal } from '../components/tutorial/InteractiveTutorialModal.js';
import { useAuthStore } from '../store/authStore.js';

export const LobbyPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [currentMatch, setCurrentMatch] = useState<{
    id: string;
    name?: string;
    code: string;
    status: string;
    currentRound: number;
    totalRounds: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create match modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [selectedGameType, setSelectedGameType] = useState<GameType>('franzen');
  const [matchName, setMatchName] = useState<string>('');
  const [totalRounds, setTotalRounds] = useState<number>(15);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(60);
  const [totalTimeBank, setTotalTimeBank] = useState<number>(300);
  const [chatEnabled, setChatEnabled] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Watten-spezifische Optionen
  const [wattenTargetScore, setWattenTargetScore] = useState<11 | 15 | 18>(15);
  const [wattenHasGueter, setWattenHasGueter] = useState<boolean>(true);
  const [wattenHasSupergueter, setWattenHasSupergueter] = useState<boolean>(false);
  const [wattenWeliRole, setWattenWeliRole] = useState<'kleinster_trumpf' | 'kleinster_schell'>('kleinster_trumpf');

  // Schnapsen-spezifische Optionen
  const [schnapsenTargetBummerl, setSchnapsenTargetBummerl] = useState<1 | 2 | 3>(1);
  const [schnapsenSubMode3, setSchnapsenSubMode3] = useState<'DREIERSCHNAPSEN_3P' | 'MITSCHREIBEN_3P'>('DREIERSCHNAPSEN_3P');
  const [schnapsenAllowZudrehen, setSchnapsenAllowZudrehen] = useState<boolean>(true);
  const [schnapsenAllowTrumpfTausch, setSchnapsenAllowTrumpfTausch] = useState<boolean>(true);
  const [schnapsenSchneiderBummerl, setSchnapsenSchneiderBummerl] = useState<boolean>(true);

  const fetchLobbiesAndCurrent = async () => {
    setLoading(true);
    try {
      const [list, active] = await Promise.all([api.listMatches(), api.getCurrentMatch()]);
      setMatches(list);
      setCurrentMatch(active.currentMatch);
    } catch (err) {
      console.error('Error fetching lobbies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbiesAndCurrent();
    const interval = setInterval(fetchLobbiesAndCurrent, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const config = GAME_TYPE_CONFIGS[selectedGameType];
      const isWatten = selectedGameType === 'watten_2' || selectedGameType === 'watten_4';
      const isSchnapsen = selectedGameType.startsWith('schnapsen');

      const payload: any = {
        name: matchName.trim() || undefined,
        gameType: selectedGameType,
        maxPlayers: config?.playerCount || 3,
        totalRounds: isWatten ? 50 : isSchnapsen ? 50 : totalRounds,
        isPrivate,
        timerEnabled,
        turnTimeLimit,
        totalTimeBank,
        chatEnabled,
      };

      if (isWatten) {
        payload.wattenOptions = {
          targetScore: wattenTargetScore,
          hasGueter: wattenHasGueter,
          hasSupergueter: wattenHasGueter && wattenHasSupergueter,
          weliRole: wattenWeliRole,
        };
      } else if (isSchnapsen) {
        payload.schnapsenOptions = {
          targetBummerl: schnapsenTargetBummerl,
          subMode3: selectedGameType === 'schnapsen_3' ? schnapsenSubMode3 : undefined,
          allowZudrehen: schnapsenAllowZudrehen,
          allowTrumpfTausch: schnapsenAllowTrumpfTausch,
          schneiderBummerl: schnapsenSchneiderBummerl,
        };
      }

      const match = await api.createMatch(payload);
      navigate(`/game/${match.id}`);
    } catch (err: any) {
      alert(err.message || 'Fehler beim Erstellen des Spiels.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinCode.trim()) return;

    try {
      const res = await api.joinByCode(joinCode.trim());
      navigate(`/game/${res.matchId}`);
    } catch (err: any) {
      setJoinError(err.message || 'Beitreten fehlgeschlagen.');
    }
  };

  const handleJoinOpenMatch = async (matchId: string, code: string) => {
    try {
      await api.joinByCode(code);
      navigate(`/game/${matchId}`);
    } catch (err: any) {
      alert(err.message || 'Fehler beim Beitreten.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Active Match Banner (Crash & Refresh Rehydration) */}
      {currentMatch && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/70 to-amber-950/80 border-2 border-amber-500 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow">
              🂡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-lg font-bold text-amber-200">
                  {currentMatch.name ? currentMatch.name : 'Laufendes Spiel aktiv'} (Code: {currentMatch.code})
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Status:{' '}
                {currentMatch.status === 'IN_PROGRESS'
                  ? `Runde ${currentMatch.currentRound} von ${currentMatch.totalRounds}`
                  : 'Wartet auf Spieler'}
                . Du bist bereits Teil dieses Tisches!
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/game/${currentMatch.id}`)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Jetzt wieder beitreten</span>
          </button>
        </div>
      )}

      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black font-serif-vintage bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
            Spiel-Lobby
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Erstelle einen eigenen Tisch oder tritt einem laufenden Spiel bei.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Neues Spiel erstellen</span>
          </button>

          <button
            onClick={fetchLobbiesAndCurrent}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Open Public Lobbies */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Offene Spieltische</span>
            </h2>
            <span className="text-xs text-slate-400">{matches.length} Tische verfügbar</span>
          </div>

          {loading && matches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              Lade Tische...
            </div>
          ) : matches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
              Aktuell sind keine offenen Spiele vorhanden. Erstelle den ersten Tisch!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matches.map((m) => {
                const tableGameType = m.gameType || 'franzen';
                const typeConfig = GAME_TYPE_CONFIGS[tableGameType] || GAME_TYPE_CONFIGS.franzen;
                const tableMaxPlayers = m.maxPlayers || typeConfig.playerCount || 3;
                const freeSeats = Math.max(0, tableMaxPlayers - m.playerCount);

                return (
                  <div
                    key={m.id}
                    className="bg-slate-900/80 border border-slate-700/80 hover:border-amber-500/60 rounded-xl p-4 transition-all duration-200 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Game Type & Rounds Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30">
                            {typeConfig.name}
                          </span>
                          {tableGameType === 'schnapsen_3' && m.schnapsenOptions?.subMode3 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30">
                              {m.schnapsenOptions.subMode3 === 'MITSCHREIBEN_3P' ? 'Mitschreiben' : 'Dreierschnapsen'}
                            </span>
                          )}
                        </div>
                        {tableGameType.startsWith('watten') ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1 shadow-sm">
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ziel: {m.wattenOptions?.targetScore ?? 15} Pkt.</span>
                          </span>
                        ) : tableGameType.startsWith('schnapsen') ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1 shadow-sm">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              Ziel: {m.schnapsenOptions?.targetBummerl ?? 1}{' '}
                              {(m.schnapsenOptions?.targetBummerl ?? 1) === 1 ? 'Bummerl' : 'Bummerl'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1 shadow-sm">
                            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{m.totalRounds} {m.totalRounds === 1 ? 'Spiel' : 'Spiele'}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="font-mono font-bold text-sm text-amber-400 tracking-wider shrink-0">
                            #{m.code}
                          </span>
                          {m.name && (
                            <span
                              className="text-xs font-bold text-amber-200 truncate bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 max-w-[140px]"
                              title={m.name}
                            >
                              {m.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-slate-200 mb-1">
                        Host: {m.hostUsername}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.playerCount} / {tableMaxPlayers} Spieler</span>
                        </div>
                        {m.timerConfig?.enabled ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>
                              {m.timerConfig.turnTimeLimit}s / {Math.round(m.timerConfig.totalTimeBank / 60)}m
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                            Kein Timer
                          </span>
                        )}
                      </div>

                      {/* Spielerliste der bereits beigetretenen Spieler */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            <span>Spieler ({m.playerCount}/{tableMaxPlayers}):</span>
                          </span>
                          <span className="text-[10px] font-medium">
                            {freeSeats === 0 ? (
                              <span className="text-rose-400 font-semibold">Tisch voll</span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">
                                {freeSeats} {freeSeats === 1 ? 'Platz frei' : 'Plätze frei'}
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {Array.from({ length: tableMaxPlayers }).map((_, seatIdx) => {
                            const player =
                              m.players?.find((p) => p.seatIndex === seatIdx) ||
                              (seatIdx === 0 && !m.players
                                ? { username: m.hostUsername, isBot: false, isHost: true }
                                : null);

                            if (player) {
                              return (
                                <div
                                  key={seatIdx}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                                    player.isHost
                                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                                      : player.isBot
                                      ? 'bg-slate-800/80 border-slate-600/60 text-slate-300'
                                      : 'bg-blue-950/50 border-blue-500/40 text-blue-200'
                                  }`}
                                  title={
                                    player.isHost
                                      ? `${player.username} (Host)`
                                      : player.isBot
                                      ? `${player.username} (KI-Bot)`
                                      : `${player.username} (Spieler)`
                                  }
                                >
                                  {player.isHost ? (
                                    <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                  ) : player.isBot ? (
                                    <Bot className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <User className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                  )}
                                  <span className="truncate max-w-[90px]">{player.username}</span>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={seatIdx}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border border-dashed border-slate-700/80 bg-slate-950/40 text-slate-500"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                <span>Frei</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinOpenMatch(m.id, m.code)}
                      className="mt-4 w-full py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Platz einnehmen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Join by Code & Bot Quick Play info */}
        <div className="space-y-6">
          {/* Join by Code Card */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Per Raum-Code beitreten</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Gib den 6-stelligen Code deines Mitspielers ein, um direkt dem Raum beizutreten.
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-3">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Z. B. FRZ982"
                className="w-full text-center tracking-widest font-mono text-lg font-bold px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 uppercase focus:outline-none focus:border-amber-500"
              />

              {joinError && <div className="text-xs text-rose-400">{joinError}</div>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm border border-slate-600 transition-colors"
              >
                Raum beitreten
              </button>
            </form>
          </div>

          {/* Practice & Bot Info Card */}
          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/60 border border-amber-600/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <span>Sofort solo testen mit Bots</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Du möchtest sofort eine Runde Franzen spielen oder die Regeln ausprobieren? Erstelle
              einfach einen Tisch und klicke auf <strong>"Bot hinzufügen"</strong>, um leere Plätze
              mit KI-Spielern zu füllen!
            </p>
          </div>

          {/* Tutorial & Rules Guide Card */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Neu bei Franzen?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lerne die Spielregeln, das 33-Karten-Blatt, Farbzwang und die geheimen Taktiken in wenigen Minuten.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Tutorial</span>
              </button>
              <Link
                to="/rules"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Regelwerk</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-auto">
            <h2 className="text-xl font-bold font-serif-vintage text-amber-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Neuen Spieltisch eröffnen</span>
            </h2>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              {/* Spielmodus auswählen */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kartenspiel wählen:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {(['franzen', 'watten_2', 'watten_4', 'schnapsen_2', 'schnapsen_3', 'schnapsen_4'] as GameType[]).map((gt) => {
                    const cfg = GAME_TYPE_CONFIGS[gt];
                    const isSelected = selectedGameType === gt;
                    return (
                      <button
                        type="button"
                        key={gt}
                        onClick={() => setSelectedGameType(gt)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {cfg.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-900 border border-slate-700/80 text-amber-400">
                            {cfg.playerCount} Spieler
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {cfg.deckSize} Karten • {cfg.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tischname (optional)
                </label>
                <input
                  type="text"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  placeholder={`z.B. Gemütliche ${GAME_TYPE_CONFIGS[selectedGameType]?.shortName}-Runde`}
                  maxLength={50}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Spielspezifische Zieleinstellungen */}
              {selectedGameType.startsWith('watten') ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ziel-Punkte (Gewinnziel):</span>
                      </label>
                      <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        {wattenTargetScore} Punkte
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {([11, 15, 18] as const).map((pts) => (
                        <button
                          type="button"
                          key={pts}
                          onClick={() => setWattenTargetScore(pts)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            wattenTargetScore === pts
                              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-md ring-2 ring-amber-400'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-black">{pts} Punkte</div>
                          <div className="text-[10px] font-normal opacity-80">
                            {pts === 11 ? 'Kurzes Spiel' : pts === 15 ? 'Standard' : 'Langes Spiel'}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Ab <strong>{wattenTargetScore - 2} Punkten</strong> ist ein Team gestrichen (kein Bieten mehr möglich).
                    </p>
                  </div>

                  {/* Watten Regeln & Sonderkarten */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-amber-400 block mb-1">
                      Regel-Varianten & Sonderkarten:
                    </span>

                    {/* Der Gute */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Der Gute</span>
                        <span className="text-[10px] text-slate-400 block">
                          Karte 1 Rang über Schlag in Trumpffarbe (z.B. Herz 8 bei Herz 7).
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={wattenHasGueter}
                        onChange={(e) => {
                          setWattenHasGueter(e.target.checked);
                          if (!e.target.checked) setWattenHasSupergueter(false);
                        }}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                      />
                    </label>

                    {/* Der Supergute */}
                    <label
                      className={`flex items-center justify-between p-2 rounded-lg border transition-opacity ${
                        wattenHasGueter
                          ? 'bg-slate-900/80 border-slate-800 cursor-pointer hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Der Supergute</span>
                        <span className="text-[10px] text-slate-400 block">
                          Karte 1 Rang über dem Guten in Trumpf (sticht alles außer Kritische).
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={!wattenHasGueter}
                        checked={wattenHasSupergueter}
                        onChange={(e) => setWattenHasSupergueter(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                      />
                    </label>

                    {/* Weli Rolle */}
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-xs font-semibold text-slate-200 block mb-1.5">
                        Rolle des Weli (Schell 6):
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWattenWeliRole('kleinster_trumpf')}
                          className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                            wattenWeliRole === 'kleinster_trumpf'
                              ? 'bg-amber-950/70 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">Kleinster Trumpf</div>
                          <div className="text-[10px] opacity-75">Gilt in jeder Trumpffarbe</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWattenWeliRole('kleinster_schell')}
                          className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                            wattenWeliRole === 'kleinster_schell'
                              ? 'bg-amber-950/70 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">Kleinster Schell</div>
                          <div className="text-[10px] opacity-75">Nur Trumpf bei Schell</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedGameType.startsWith('schnapsen') ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30">
                  {/* Bummerl Ziel */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Match-Ziel (Bummerl):</span>
                      </label>
                      <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                        {schnapsenTargetBummerl} {schnapsenTargetBummerl === 1 ? 'Bummerl' : 'Bummerl'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {([1, 2, 3] as const).map((bummerl) => (
                        <button
                          type="button"
                          key={bummerl}
                          onClick={() => setSchnapsenTargetBummerl(bummerl)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            schnapsenTargetBummerl === bummerl
                              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-md ring-2 ring-amber-400'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-black">{bummerl} Bummerl</div>
                          <div className="text-[10px] font-normal opacity-80">
                            {bummerl === 1 ? 'Einfaches Spiel' : bummerl === 2 ? 'Best-of-3' : 'Klassisches Bummerl-Match'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bei 3er-Schnapsen: Modusauswahl */}
                  {selectedGameType === 'schnapsen_3' && (
                    <div className="pt-2 border-t border-slate-800">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        Dreierschnapsen Spielmodus:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSchnapsenSubMode3('DREIERSCHNAPSEN_3P')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            schnapsenSubMode3 === 'DREIERSCHNAPSEN_3P'
                              ? 'bg-amber-950/70 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">Echtes Dreierschnapsen</div>
                          <div className="text-[10px] opacity-75 mt-0.5">
                            3 aktive Spieler, Talon & Lizitation. Von 24 auf 0.
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSchnapsenSubMode3('MITSCHREIBEN_3P')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            schnapsenSubMode3 === 'MITSCHREIBEN_3P'
                              ? 'bg-amber-950/70 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">Mitschreiben (Geber pausiert)</div>
                          <div className="text-[10px] opacity-75 mt-0.5">
                            1-gegen-1 (Vorhand vs. Hinterhand). Von 7 auf 0.
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Schnapsen Regeln & Varianten */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-amber-400 block mb-1">
                      Regel-Optionen:
                    </span>

                    {/* Zudrehen */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Zudrehen erlauben</span>
                        <span className="text-[10px] text-slate-400 block">
                          Talon sperren und sofortigen Farb- & Stichzwang aktivieren.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={schnapsenAllowZudrehen}
                        onChange={(e) => setSchnapsenAllowZudrehen(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                      />
                    </label>

                    {/* Trumpftausch */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Trumpftausch mit Bube erlauben</span>
                        <span className="text-[10px] text-slate-400 block">
                          Offene Atout-Karte mit dem Atout-Unter/Buben austauschen.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={schnapsenAllowTrumpfTausch}
                        onChange={(e) => setSchnapsenAllowTrumpfTausch(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                      />
                    </label>

                    {/* Schneider-Bummerl */}
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Schneider-Bummerl (doppelt)</span>
                        <span className="text-[10px] text-slate-400 block">
                          Zählt als 2 Bummerl, wenn der Verlierer noch auf Startpunkten steht.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={schnapsenSchneiderBummerl}
                        onChange={(e) => setSchnapsenSchneiderBummerl(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* Franzen: Standard Rundenanzahl */
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Anzahl der Spiele / Runden:
                    </label>
                    <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      {totalRounds} {totalRounds === 1 ? 'Spiel' : 'Spiele'}
                    </span>
                  </div>

                  {/* Schnellwahl Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                    {[1, 3, 5, 10, 15].map((rounds) => (
                      <button
                        type="button"
                        key={rounds}
                        onClick={() => setTotalRounds(rounds)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          totalRounds === rounds
                            ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {rounds} Rd.
                      </button>
                    ))}
                  </div>

                  {/* Eigene Rundenanzahl eingeben */}
                  <div className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Oder eigene Anzahl:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={totalRounds || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) {
                          setTotalRounds(1);
                        } else {
                          setTotalRounds(Math.max(1, Math.min(100, val)));
                        }
                      }}
                      className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg text-slate-100 text-xs font-bold text-center focus:outline-none"
                      placeholder="1–100"
                    />
                    <span className="text-[11px] text-slate-400">Spiele (1 – 100)</span>
                  </div>
                </div>
              )}

              {/* Timer Settings */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={timerEnabled}
                      onChange={(e) => setTimerEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                    />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Bedenkzeit / Timer aktivieren</span>
                    </div>
                  </label>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {timerEnabled ? 'Aktiv' : 'Deaktiviert'}
                  </span>
                </div>

                {timerEnabled ? (
                  <div className="space-y-3 pl-6 pt-1">
                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Max. Bedenkzeit pro Zug:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 30, label: '30s' },
                          { val: 45, label: '45s' },
                          { val: 60, label: '60s (1m)' },
                          { val: 90, label: '90s' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setTurnTimeLimit(opt.val)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                              turnTimeLimit === opt.val
                                ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 font-medium mb-1">
                        Gesamtzeit pro Spieler (ganzes Spiel):
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 180, label: '3 Min' },
                          { val: 300, label: '5 Min' },
                          { val: 600, label: '10 Min' },
                          { val: 900, label: '15 Min' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setTotalTimeBank(opt.val)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                              totalTimeBank === opt.val
                                ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pl-6">
                    Ohne Zeitbegrenzung: Spieler können beliebig lange überlegen.
                  </p>
                )}
              </div>

              {/* Chat Option */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={chatEnabled}
                      onChange={(e) => setChatEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                    />
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      <span>In-Game Chat aktivieren</span>
                    </div>
                  </label>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {chatEnabled ? 'Aktiv' : 'Deaktiviert'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pl-6 mt-1">
                  {chatEnabled
                    ? 'Mitspieler können während des Spiels Nachrichten austauschen.'
                    : 'Chat wird für dieses Match vollständig ausgeschaltet.'}
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Privates Spiel (nur per Raum-Code beitreten)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 text-sm font-black shadow transition-all"
                >
                  {isCreating ? 'Wird erstellt...' : 'Tisch eröffnen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Interactive Tutorial Modal */}
      <InteractiveTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};
