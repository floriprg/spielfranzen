import { Award, Calendar, Crown, Shield, Trophy, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getUserProfile(username);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Profil konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-300">
        <h2 className="text-xl font-bold text-rose-400 mb-2">Benutzer nicht gefunden</h2>
        <p className="text-sm text-slate-400">{error || 'Das Profil existiert nicht.'}</p>
      </div>
    );
  }

  const winRate =
    profile.matchesPlayed > 0
      ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100)
      : 0;

  const soloWinRate =
    profile.soloGamesPlayed > 0
      ? Math.round((profile.soloGamesWon / profile.soloGamesPlayed) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header Card */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-md mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg">
          {profile.username.slice(0, 2).toUpperCase()}
        </div>

        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-black font-serif-vintage bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
            {profile.username}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Mitglied seit {new Date(profile.createdAt).toLocaleDateString('de-DE')}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              {profile.eloRating} ELO Rating
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Lifetime Score */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Gesamtpunkte
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              profile.lifetimeScore > 0
                ? 'text-emerald-400'
                : profile.lifetimeScore < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {profile.lifetimeScore > 0 ? `+${profile.lifetimeScore}` : profile.lifetimeScore}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Nullsummensystem</div>
        </div>

        {/* ELO Rating */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            ELO-Rating
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">{profile.eloRating}</div>
          <div className="text-[11px] text-slate-500 mt-1">3-Spieler MMR</div>
        </div>

        {/* Matches Won & Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Matches Gewonnen
          </div>
          <div className="text-2xl font-black font-mono text-slate-100">
            {profile.matchesWon} / {profile.matchesPlayed}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">{winRate}% Siegrate</div>
        </div>

        {/* Solo Rounds Won & Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Alleinspieler-Quote
          </div>
          <div className="text-2xl font-black font-mono text-slate-100">
            {profile.soloGamesWon} / {profile.soloGamesPlayed}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">{soloWinRate}% Erfolgsquote</div>
        </div>
      </div>

      {/* Match History */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-500" />
          <span>Kürzliche Matches</span>
        </h2>

        {!profile.participations || profile.participations.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Bisher wurden noch keine Matches absolviert.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {profile.participations.map((p: any) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono font-bold text-amber-400">#{p.match.code}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    {p.match.totalRounds} Runden • Status: {p.match.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(p.match.createdAt).toLocaleDateString('de-DE')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
