import { MatchResult } from '@spielfranzen/shared';
import { Award, Crown, Home, Medal, Trophy } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MatchCompletedModalProps {
  matchResult: MatchResult;
  currentUserId?: string;
}

export const MatchCompletedModal: React.FC<MatchCompletedModalProps> = ({
  matchResult,
  currentUserId,
}) => {
  const navigate = useNavigate();
  const { rankings, totalRounds } = matchResult;

  const myRankEntry = currentUserId ? rankings.find((r) => r.userId === currentUserId) : null;
  const isWinner = myRankEntry ? myRankEntry.rank === 1 : false;

  const rankBadges = [
    { label: '1. Platz', color: 'from-amber-400 to-yellow-500 text-slate-950', icon: Crown },
    { label: '2. Platz', color: 'from-slate-300 to-slate-400 text-slate-950', icon: Medal },
    { label: '3. Platz', color: 'from-amber-700 to-amber-800 text-amber-100', icon: Award },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 bg-amber-950/80 border-2 border-amber-400 animate-bounce">
          <Trophy className="w-10 h-10 text-amber-400" />
        </div>

        <h2 className="text-3xl font-bold font-serif-vintage text-amber-300">
          {myRankEntry && isWinner
            ? 'Glückwunsch! 🏆'
            : 'Match Beendet!'}
        </h2>
        <p className="text-sm font-semibold text-slate-200 mt-1">
          {myRankEntry ? (
            isWinner ? (
              <span className="text-emerald-400 font-bold">
                Du hast das Match gewonnen! 🎉 (1. Platz nach {totalRounds} Runden)
              </span>
            ) : myRankEntry.rank === 2 ? (
              <span className="text-amber-200 font-bold">
                Starke Partie! Du belegst den 2. Platz nach {totalRounds} Runden.
              </span>
            ) : (
              <span className="text-slate-300">
                Gutes Spiel! Du belegst den 3. Platz nach {totalRounds} Runden.
              </span>
            )
          ) : (
            `Alle ${totalRounds} Runden wurden erfolgreich abgeschlossen.`
          )}
        </p>

        {/* Podium / Final Standings */}
        <div className="my-6 space-y-3">
          {rankings.map((r, index) => {
            const badge = rankBadges[index] || rankBadges[2]!;
            const Icon = badge.icon;
            const isMe = currentUserId && r.userId === currentUserId;
            return (
              <div
                key={r.userId}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-400/80 shadow-lg ring-1 ring-amber-400/50'
                    : index === 0
                    ? 'bg-amber-950/50 border-amber-500/60 shadow-lg ring-1 ring-amber-400/40'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-r ${badge.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      <span className={isMe ? 'text-amber-300 font-extrabold' : ''}>{r.username}</span>
                      {isMe && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 shadow-sm">
                          Du
                        </span>
                      )}
                      {r.isBot && <span className="text-xs text-slate-400 font-normal">(Bot)</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      ELO: {r.eloDelta >= 0 ? `+${r.eloDelta}` : r.eloDelta} (Neu: {r.eloAfter})
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-base font-black ${
                      r.finalScore > 0
                        ? 'text-emerald-400'
                        : r.finalScore < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {r.finalScore > 0 ? `+${r.finalScore}` : r.finalScore} Pkt
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">Rang {r.rank}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Return Button */}
        <button
          onClick={() => navigate('/lobby')}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span>Zurück zur Lobby</span>
        </button>
      </div>
    </div>
  );
};
