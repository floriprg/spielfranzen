import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton.js';
import { useAuthStore } from '../store/authStore.js';

export const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(emailOrUsername, password);
      navigate('/lobby');
    } catch {
      // Handled in store
    }
  };

  const handleQuickLogin = async (username: string) => {
    clearError();
    try {
      await login(username, 'secret123');
      navigate('/lobby');
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 bg-radial from-slate-900 to-slate-950">
      <div className="max-w-md w-full bg-slate-900/90 border border-amber-600/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-slate-950 font-black text-3xl shadow-lg mb-3">
            🂡
          </div>
          <h1 className="text-3xl font-black font-serif-vintage tracking-wide bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
            Franzen Online
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Das traditionelle 3-Spieler-Kartenspiel
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Google Login */}
        <div className="mb-5">
          <GoogleAuthButton mode="login" />
        </div>

        <div className="relative flex py-1 items-center mb-4">
          <div className="flex-grow border-t border-slate-700/60" />
          <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium">
            oder mit Passwort
          </span>
          <div className="flex-grow border-t border-slate-700/60" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Benutzername oder E-Mail
            </label>
            <input
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="z. B. Flori_King"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Passwort</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'Anmeldung läuft...' : 'Anmelden'}
          </button>
        </form>

        {/* Quick Demo Logins for Pair Programming & Testing */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
            1-Klick Test-Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('Flori_King')}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-medium transition-colors"
            >
              Flori_King
            </button>
            <button
              onClick={() => handleQuickLogin('BavarianAce')}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-medium transition-colors"
            >
              BavarianAce
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-amber-400 hover:underline font-semibold">
            Jetzt kostenlos registrieren
          </Link>
        </div>
      </div>
    </div>
  );
};
