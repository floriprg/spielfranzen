import { LeaderboardEntry } from '@spielfranzen/shared';
import { Award, Crown, Medal, Trophy, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export const LeaderboardPage: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'lifetimeScore' | 'elo' | 'wins'>('lifetimeScore');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await api.getLeaderboard(sortBy);
      setEntries(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black font-serif-vintage bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-400 inline" />
            <span>Globale Franzen-Bestenliste</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Das offizielle Ranking nach Nullsummen-Gesamtpunkten und dynamischem 3-Spieler-ELO.
          </p>
        </div>

        {/* Sort Filter Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSortBy('lifetimeScore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === 'lifetimeScore'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gesamtpunkte
          </button>
          <button
            onClick={() => setSortBy('elo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === 'elo'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ELO-Rating
          </button>
          <button
            onClick={() => setSortBy('wins')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === 'wins'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Siege (1. Platz)
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto mb-2" />
            Lade Rangliste...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Noch keine Spiele abgeschlossen.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rang</th>
                  <th className="py-3 px-4">Spieler</th>
                  <th className="py-3 px-4 text-right">Gesamtpunkte</th>
                  <th className="py-3 px-4 text-right">ELO</th>
                  <th className="py-3 px-4 text-right">Matches</th>
                  <th className="py-3 px-4 text-right">Siegrate</th>
                  <th className="py-3 px-4 text-right">Alleinspieler-Quote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        {rank === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-400 text-slate-950 flex items-center justify-center font-black text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs pl-2">{rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        <Link
                          to={`/profile/${entry.username}`}
                          className="hover:text-amber-400 transition-colors flex items-center gap-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center border border-slate-700">
                            {entry.username.slice(0, 1).toUpperCase()}
                          </div>
                          <span>{entry.username}</span>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            entry.lifetimeScore > 0
                              ? 'text-emerald-400'
                              : entry.lifetimeScore < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }
                        >
                          {entry.lifetimeScore > 0
                            ? `+${entry.lifetimeScore}`
                            : entry.lifetimeScore}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                        {entry.eloRating}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {entry.matchesPlayed} ({entry.matchesWon} Siege)
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700">
                          {entry.winRate}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs text-slate-400">
                          {entry.soloGamesWon}/{entry.soloGamesPlayed} ({entry.soloWinRate}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
