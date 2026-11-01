import { MatchListItem } from '@spielfranzen/shared';
import { ArrowRight, Bot, Clock, Key, Lock, Play, Plus, RefreshCw, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

export const LobbyPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [currentMatch, setCurrentMatch] = useState<{
    id: string;
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
  const [totalRounds, setTotalRounds] = useState<number>(15);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(60);
  const [totalTimeBank, setTotalTimeBank] = useState<number>(300);
  const [isCreating, setIsCreating] = useState<boolean>(false);

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
      const match = await api.createMatch({
        totalRounds,
        isPrivate,
        timerEnabled,
        turnTimeLimit,
        totalTimeBank,
      });
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
                  Laufendes Spiel aktiv (Code: {currentMatch.code})
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
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-900/80 border border-slate-700/80 hover:border-amber-500/60 rounded-xl p-4 transition-all duration-200 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm text-amber-400 tracking-wider">
                        #{m.code}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {m.totalRounds} Runden
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-200 mb-1">
                      Host: {m.hostUsername}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.playerCount} / 3 Spieler</span>
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
                  </div>

                  <button
                    onClick={() => handleJoinOpenMatch(m.id, m.code)}
                    className="mt-4 w-full py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Platz einnehmen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold font-serif-vintage text-amber-400 mb-4">
              Neuen Tisch erstellen
            </h2>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Anzahl der Runden ({totalRounds} Runden)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[5, 10, 15, 20].map((rounds) => (
                    <button
                      type="button"
                      key={rounds}
                      onClick={() => setTotalRounds(rounds)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        totalRounds === rounds
                          ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {rounds} Rd.
                    </button>
                  ))}
                </div>
              </div>

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
    </div>
  );
};
