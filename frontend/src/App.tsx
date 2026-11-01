import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/common/Navbar.js';
import { GamePage } from './pages/GamePage.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { LobbyPage } from './pages/LobbyPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { useAuthStore } from './store/authStore.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <div className="h-dvh max-h-dvh bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <LobbyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/:matchId"
              element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/lobby" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
