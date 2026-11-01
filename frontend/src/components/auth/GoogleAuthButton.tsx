import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { AlertCircle, Check, Info, Shield, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface GoogleAuthButtonProps {
  mode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode = 'login',
  onSuccess,
}) => {
  const { loginWithGoogle, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [showDevModal, setShowDevModal] = useState(false);
  const [customName, setCustomName] = useState('Flori Google');
  const [customEmail, setCustomEmail] = useState('flori.google@gmail.com');

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const hasRealClientId = Boolean(
    clientId && clientId.length > 5 && !clientId.includes('your_google_client_id'),
  );

  const handleCredentialSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) return;
    clearError();
    try {
      await loginWithGoogle(credentialResponse.credential);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/lobby');
      }
    } catch {
      // Handled in store
    }
  };

  const handleDevLogin = async (name: string, email: string) => {
    clearError();
    try {
      await loginWithGoogle(undefined, {
        googleId: `google_mock_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name,
        email,
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      });
      setShowDevModal(false);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/lobby');
      }
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="w-full">
      {hasRealClientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <div className="w-full flex justify-center [&>div]:w-full [&>div>iframe]:!w-full [&>div>iframe]:!rounded-xl shadow">
            <GoogleLogin
              onSuccess={handleCredentialSuccess}
              onError={() => console.error('Google Sign-In failed')}
              text={mode === 'register' ? 'signup_with' : 'signin_with'}
              shape="pill"
              theme="filled_black"
              size="large"
              width="100%"
            />
          </div>
        </GoogleOAuthProvider>
      ) : (
        /* Styled Google Button (Development / Fallback) */
        <button
          type="button"
          onClick={() => setShowDevModal(true)}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2.5 active:scale-95 border border-slate-300 cursor-pointer disabled:opacity-50"
        >
          <GoogleLogoSvg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span>
            {mode === 'register' ? 'Mit Google registrieren' : 'Mit Google anmelden'}
          </span>
        </button>
      )}

      {/* Dev / Test Account Modal when no Client ID is provided in .env */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow">
                <GoogleLogoSvg className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">
                  Google-Anmeldung
                </h3>
                <span className="text-[11px] text-amber-400 font-medium">
                  Entwicklungs- & Testmodus
                </span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 mb-4 space-y-2">
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  Es ist noch keine <strong>VITE_GOOGLE_CLIENT_ID</strong> in der{' '}
                  <code className="text-amber-300">.env</code> hinterlegt.
                </span>
              </p>
              <p className="text-[11px] text-slate-400 pl-6">
                Für echte Google-Logins trage eine Web-Client-ID aus der Google Cloud
                Console in <code className="text-amber-300">.env</code> ein. Du kannst
                jetzt direkt mit einem simulierten Google-Konto testen:
              </p>
            </div>

            <div className="space-y-3">
              {/* Quick default test account */}
              <button
                type="button"
                onClick={() => handleDevLogin('Flori Google', 'flori.google@gmail.com')}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Als "Flori Google" (flori.google@gmail.com) anmelden</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase font-semibold">
                  oder individueller Google-Nutzer
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Custom test inputs */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Google-Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Google E-Mail
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDevLogin(customName, customEmail)}
                  disabled={isLoading || !customName || !customEmail}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Mit diesen Daten anmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
