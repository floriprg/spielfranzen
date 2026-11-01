import {
  AuthResponse,
  CreateMatchRequest,
  GoogleAuthRequest,
  LeaderboardEntry,
  LoginRequest,
  MatchListItem,
  RegisterRequest,
  UserProfile,
} from '@spielfranzen/shared';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('spielfranzen_jwt');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('spielfranzen_jwt', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('spielfranzen_jwt');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: RegisterRequest) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginRequest) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginWithGoogle: (payload: GoogleAuthRequest) =>
    request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<UserProfile>('/auth/me'),

  // Matches
  listMatches: () => request<MatchListItem[]>('/matches'),

  getCurrentMatch: () =>
    request<{
      currentMatch: {
        id: string;
        code: string;
        status: string;
        currentRound: number;
        totalRounds: number;
      } | null;
    }>('/matches/current'),

  createMatch: (payload: CreateMatchRequest) =>
    request<any>('/matches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMatch: (id: string) => request<any>(`/matches/${id}`),

  joinByCode: (code: string) =>
    request<{ matchId: string; seatIndex: number }>('/matches/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Leaderboard
  getLeaderboard: (sortBy: 'lifetimeScore' | 'elo' | 'wins' = 'lifetimeScore') =>
    request<LeaderboardEntry[]>(`/leaderboard?sortBy=${sortBy}`),

  getUserProfile: (username: string) => request<any>(`/leaderboard/users/${username}`),
};
