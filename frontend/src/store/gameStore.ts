import {
  CardRank,
  ChatMessage,
  ClientToServerEvents,
  MatchResult,
  RoundResult,
  SanitizedGameState,
  SchnapsenCallType,
  ServerToClientEvents,
  Suit,
  Trick,
} from '@spielfranzen/shared';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { getAuthToken } from '../api/client.js';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface GameStateStore {
  socket: TypedSocket | null;
  isConnected: boolean;
  gameState: SanitizedGameState | null;
  lastTrickCompleted: { trick: Trick; delayMs: number } | null;
  error: string | null;
  activeMatchId: string | null;

  connectSocket: (matchId: string) => void;
  disconnectSocket: () => void;
  sendBid: (action: 'open' | 'raise' | 'hold' | 'pass', bidValue?: number) => void;
  sendTalonAction: (
    action: 'take_talon' | 'declare_hand' | 'discard_and_declare',
    discardedCardIds?: string[],
    selectedMode?: number,
  ) => void;
  playCard: (cardId: string) => void;
  nextRound: () => void;
  addBot: (seatIndex: number) => void;
  removeBot: (seatIndex: number) => void;
  surrender: (surrenderType?: 'round' | 'match') => void;
  sendWattenAction: (
    action: 'choose_schlag' | 'choose_farbe' | 'bet' | 'hold' | 'fold',
    schlag?: CardRank,
    farbe?: Suit,
  ) => void;
  sendSchnapsenAction: (
    action:
      | 'announce_marriage'
      | 'swap_trump'
      | 'close_talon'
      | 'declare_mode'
      | 'declare_66'
      | 'select_atout'
      | 'reveal_card'
      | 'redeal_3_buben'
      | 'bid'
      | 'pass'
      | 'kontra'
      | 'exchange_talon',
    payload?: {
      suit?: Suit;
      callType?: SchnapsenCallType;
      cardIndex?: number;
      discardIds?: string[];
    },
  ) => void;
  sendChatMessage: (text: string) => void;
  clearError: () => void;
}

export const useGameStore = create<GameStateStore>((set, get) => ({
  socket: null,
  isConnected: false,
  gameState: null,
  lastTrickCompleted: null,
  error: null,
  activeMatchId: null,

  clearError: () => set({ error: null }),

  connectSocket: (matchId: string) => {
    // If already connected to this match, don't recreate
    const currentSocket = get().socket;
    if (currentSocket && currentSocket.connected && get().activeMatchId === matchId) {
      currentSocket.emit('game:join_match', { matchId });
      return;
    }

    if (currentSocket) {
      currentSocket.disconnect();
    }

    const token = getAuthToken();
    const socket: TypedSocket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ isConnected: true, activeMatchId: matchId, error: null });
      socket.emit('game:join_match', { matchId });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err);
      set({ isConnected: false, error: err.message || 'Verbindung zum Spieltisch fehlgeschlagen.' });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('game:state_sync', (state: SanitizedGameState) => {
      set({ gameState: state, error: null });
    });

    socket.on('game:trick_completed', ({ trick, delayMs }) => {
      set({ lastTrickCompleted: { trick, delayMs } });
    });

    socket.on('game:round_ended', (result: RoundResult) => {
      // The state sync will carry lastRoundResult, but we can update state
      const current = get().gameState;
      if (current) {
        set({
          gameState: {
            ...current,
            phase: 'ROUND_SUMMARY',
            lastRoundResult: result,
          },
        });
      }
    });

    socket.on('game:match_completed', (result: MatchResult) => {
      const current = get().gameState;
      if (current) {
        set({
          gameState: {
            ...current,
            phase: 'MATCH_COMPLETED',
            matchResult: result,
          },
        });
      }
    });

    socket.on('game:error', ({ message }) => {
      set({ error: message });
    });

    socket.on('chat:new_message', (msg: ChatMessage) => {
      const current = get().gameState;
      if (current) {
        const msgs = current.chatMessages || [];
        if (!msgs.some((m) => m.id === msg.id)) {
          set({
            gameState: {
              ...current,
              chatMessages: [...msgs, msg],
            },
          });
        }
      }
    });

    set({ socket, activeMatchId: matchId });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false, gameState: null, activeMatchId: null });
  },

  sendBid: (action, bidValue) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:bid', { matchId: activeMatchId, action, bidValue });
  },

  sendTalonAction: (action, discardedCardIds, selectedMode) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:talon_action', {
      matchId: activeMatchId,
      action,
      discardedCardIds,
      selectedMode: selectedMode || 5,
    });
  },

  playCard: (cardId: string) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:play_card', { matchId: activeMatchId, cardId });
  },

  nextRound: () => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:next_round', { matchId: activeMatchId });
  },

  addBot: (seatIndex: number) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:add_bot', { matchId: activeMatchId, seatIndex });
  },

  removeBot: (seatIndex: number) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:remove_bot', { matchId: activeMatchId, seatIndex });
  },

  surrender: (surrenderType = 'round') => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:surrender', { matchId: activeMatchId, surrenderType });
  },

  sendWattenAction: (action, schlag, farbe) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:watten_action', { matchId: activeMatchId, action, schlag, farbe });
  },

  sendSchnapsenAction: (action, payload) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId) return;
    socket.emit('game:schnapsen_action', { matchId: activeMatchId, action, ...payload });
  },

  sendChatMessage: (text: string) => {
    const { socket, activeMatchId } = get();
    if (!socket || !activeMatchId || !text.trim()) return;
    socket.emit('chat:send_message', { matchId: activeMatchId, text: text.trim() });
  },
}));
