import { Award, LogOut, Trophy, User } from 'lucide-react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-amber-600/20 px-3 sm:px-4 py-1.5 sm:py-2 flex-shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/lobby" className="flex items-center gap-1.5 sm:gap-2 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-slate-950 font-black text-base sm:text-lg shadow-md group-hover:scale-105 transition-transform">
            🂡
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-wide font-serif-vintage bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent leading-none">
              FRANZEN
            </span>
            <span className="text-[8px] sm:text-[9px] text-amber-500/80 font-semibold uppercase tracking-widest hidden sm:block">
              Tradition Online
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        {user && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
            <Link to="/lobby" className="hover:text-amber-400 transition-colors">
              Lobby
            </Link>
            <Link
              to="/leaderboard"
              className="flex items-center gap-1 hover:text-amber-400 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Bestenliste</span>
            </Link>
            <Link
              to={`/profile/${user.username}`}
              className="flex items-center gap-1 hover:text-amber-400 transition-colors"
            >
              <User className="w-4 h-4 text-amber-500" />
              <span>Profil</span>
            </Link>
          </nav>
        )}

        {/* User Pill & Logout */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={`/profile/${user.username}`}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-amber-500/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full hover:border-amber-400 transition-colors"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-600/30 text-amber-300 font-bold text-[11px] sm:text-xs flex items-center justify-center">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col text-left text-xs">
                <span className="font-bold text-slate-100 leading-tight">{user.username}</span>
                <span className="text-[10px] text-amber-400 font-medium hidden sm:inline">
                  {user.eloRating} ELO • {user.lifetimeScore} Pkt
                </span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Abmelden"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors"
            >
              Anmelden
            </Link>
            <Link
              to="/register"
              className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow transition-colors"
            >
              Registrieren
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
