// Suit types for the German 33-card Bavarian deck
export type Suit = 'EICHEL' | 'LAUB' | 'SCHELL' | 'HERZ';

// Card Rank (1 = Weli, 2..9 = 7, 8, 9, Unter, Ober, König, 10, Ass)
export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Card {
  id: string; // e.g. "EICHEL_9", "WELI"
  suit: Suit;
  rank: CardRank;
  points: number; // 0, 2, 3, 4, 10, 11
  name: string; // "Eichel Ass", "Schell Weli", etc.
  shortName: string; // "A", "10", "K", "O", "U", "9", "8", "7", "W"
}

// Modes 4 to 12
export type GameMode =
  | 4 // "Ich spiele" (Bidding only)
  | 5 // Eichel (Trump: EICHEL, W: 100)
  | 6 // Laub (Trump: LAUB, W: 100)
  | 7 // Schell (Trump: SCHELL, W: 100)
  | 8 // Herz (Trump: HERZ, W: 100)
  | 9 // Bettl (No Trump, 0 tricks, talon allowed, W: 200)
  | 10 // Mord (No Trump, 10 tricks, talon allowed, W: 300)
  | 11 // Doppelbettl (No Trump, 0 tricks, NO talon, W: 400)
  | 12; // Doppelmord (No Trump, 10 tricks, NO talon, W: 600)

export const GAME_MODE_INFO: Record<
  GameMode,
  {
    name: string;
    description: string;
    baseValue: number;
    trumpSuit: Suit | null;
    isBettl: boolean;
    isMord: boolean;
    noTalonAllowed: boolean;
  }
> = {
  4: {
    name: 'Ich spiele (4)',
    description: 'Einstiegsgebot beim Bieten (verpflichtet mindestens zu Farbspiel 5)',
    baseValue: 100,
    trumpSuit: null,
    isBettl: false,
    isMord: false,
    noTalonAllowed: false,
  },
  5: {
    name: 'Eichel (5)',
    description: 'Trumpf ist Eichel. Ziel: 66 Augen oder 10. Stich.',
    baseValue: 100,
    trumpSuit: 'EICHEL',
    isBettl: false,
    isMord: false,
    noTalonAllowed: false,
  },
  6: {
    name: 'Laub (6)',
    description: 'Trumpf ist Laub. Ziel: 66 Augen oder 10. Stich.',
    baseValue: 100,
    trumpSuit: 'LAUB',
    isBettl: false,
    isMord: false,
    noTalonAllowed: false,
  },
  7: {
    name: 'Schell (7)',
    description: 'Trumpf ist Schell. Ziel: 66 Augen oder 10. Stich.',
    baseValue: 100,
    trumpSuit: 'SCHELL',
    isBettl: false,
    isMord: false,
    noTalonAllowed: false,
  },
  8: {
    name: 'Herz (8)',
    description: 'Trumpf ist Herz. Ziel: 66 Augen oder 10. Stich.',
    baseValue: 100,
    trumpSuit: 'HERZ',
    isBettl: false,
    isMord: false,
    noTalonAllowed: false,
  },
  9: {
    name: 'Bettl (9)',
    description: 'Kein Trumpf. Ziel: Exakt 0 Stiche machen (Talon erlaubt).',
    baseValue: 200,
    trumpSuit: null,
    isBettl: true,
    isMord: false,
    noTalonAllowed: false,
  },
  10: {
    name: 'Mord (10)',
    description: 'Kein Trumpf. Ziel: Alle 10 Stiche machen (Talon erlaubt).',
    baseValue: 300,
    trumpSuit: null,
    isBettl: false,
    isMord: true,
    noTalonAllowed: false,
  },
  11: {
    name: 'Doppelbettl (11)',
    description: 'Kein Trumpf. Ziel: Exakt 0 Stiche machen (KEIN Talon!).',
    baseValue: 400,
    trumpSuit: null,
    isBettl: true,
    isMord: false,
    noTalonAllowed: true,
  },
  12: {
    name: 'Doppelmord (12)',
    description: 'Kein Trumpf. Ziel: Alle 10 Stiche machen (KEIN Talon!).',
    baseValue: 600,
    trumpSuit: null,
    isBettl: false,
    isMord: true,
    noTalonAllowed: true,
  },
};

export type GamePhase =
  | 'WAITING_FOR_PLAYERS'
  | 'DEALING'
  | 'BIDDING'
  | 'TALON_AND_DECLARATION'
  | 'TRICK_PLAY'
  | 'ROUND_SUMMARY'
  | 'MATCH_COMPLETED';

export type MatchStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export type PlayerRole = 'DECLARER' | 'DEFENDER' | 'NONE';

export interface BiddingHistoryEntry {
  seatIndex: number;
  username: string;
  action: 'open' | 'raise' | 'hold' | 'pass';
  bidValue?: number;
  text: string;
}

export interface BiddingState {
  phase: 'OPENING' | 'DUEL' | 'COMPLETED' | 'ALL_PASSED';
  currentBid: number;
  holderSeat: number | null; // Currently holds the bid with priority
  challengerSeat: number | null; // Next challenger
  currentTurnSeat: number;
  passedSeats: number[]; // Seats that have passed and are out
  history: BiddingHistoryEntry[];
}

export interface PlayedCard {
  seatIndex: number;
  card: Card;
}

export interface Trick {
  trickNumber: number; // 1 to 10
  leadSeat: number;
  cards: PlayedCard[];
  winnerSeat?: number;
  points?: number;
}

export interface PlayerSeatState {
  seatIndex: number;
  userId: string;
  username: string;
  isBot: boolean;
  isOnline: boolean;
  score: number; // Current match score (zero-sum)
  role: PlayerRole;
  tricksWon: number;
  cardPointsWon: number;
}

export interface RoundResult {
  roundNumber: number;
  dealerSeat: number;
  declarerSeat: number;
  gameMode: GameMode;
  declarerWon: boolean;
  declarerCardPoints: number;
  defenderCardPoints: number;
  scoreDeltaDeclarer: number;
  scoreDeltaDefenders: number;
  reason: string; // e.g. "Alleinspieler hat 68 Augen erreicht", "10. Stich gestochen", etc.
  scoresAfterRound: { seatIndex: number; score: number }[];
}

export interface MatchResult {
  matchId: string;
  totalRounds: number;
  rankings: {
    rank: number;
    userId: string;
    username: string;
    isBot: boolean;
    finalScore: number;
    eloBefore: number;
    eloDelta: number;
    eloAfter: number;
  }[];
}

// Timer Configuration and State
export interface GameTimerConfig {
  enabled: boolean;
  turnTimeLimit: number; // seconds per turn, default 60
  totalTimeBank: number; // total seconds per player for match, default 300 (5 mins)
}

export interface GameTimerState {
  config: GameTimerConfig;
  turnStartedAt: number | null; // epoch timestamp in ms
  turnDuration: number; // allotted seconds for current turn
  playerBanks: [number, number, number]; // remaining bank seconds for seat 0, 1, 2
}

// Full Server-Side State (Stored in DB JSONB and in memory)
export interface FullGameState {
  matchId: string;
  code: string;
  status: MatchStatus;
  isPrivate?: boolean;
  chatEnabled?: boolean;
  chatMessages?: ChatMessage[];
  totalRounds: number;
  currentRound: number;
  phase: GamePhase;
  dealerSeat: number;
  currentTurnSeat: number;
  declarerSeat: number | null;
  gameMode: GameMode | null;
  minMode: GameMode | null;
  talonTaken: boolean;
  talonRevealed?: boolean;
  players: [PlayerSeatState, PlayerSeatState, PlayerSeatState];
  hands: [Card[], Card[], Card[]]; // 10 cards each
  talon: Card[]; // 3 cards
  discardedCards: Card[]; // 3 cards discarded by declarer
  biddingState: BiddingState;
  currentTrick: PlayedCard[];
  trickLeadSeat: number;
  trickHistory: Trick[];
  declarerCardPoints: number;
  defenderCardPoints: number;
  lastRoundResult: RoundResult | null;
  matchResult: MatchResult | null;
  timer: GameTimerState;
}

// Client-Sanitized State (Anti-Cheat: Opponent hands & hidden talon stripped)
export interface SanitizedPlayerSeat {
  seatIndex: number;
  userId: string;
  username: string;
  isBot: boolean;
  isOnline: boolean;
  score: number;
  role: PlayerRole;
  handCount: number;
  tricksWon: number;
  cardPointsWon: number;
}

export interface SanitizedGameState {
  matchId: string;
  code: string;
  status: MatchStatus;
  isPrivate?: boolean;
  chatEnabled?: boolean;
  chatMessages?: ChatMessage[];
  totalRounds: number;
  currentRound: number;
  phase: GamePhase;
  dealerSeat: number;
  currentTurnSeat: number;
  declarerSeat: number | null;
  gameMode: GameMode | null;
  minMode: GameMode | null;
  talonTaken: boolean;
  talonRevealed?: boolean;
  mySeatIndex: number | null; // Seat index of the requesting player (or null for spectators)
  players: [SanitizedPlayerSeat, SanitizedPlayerSeat, SanitizedPlayerSeat];
  myHand: Card[]; // Only the requesting player's hand!
  talonCount: number;
  talonCards: Card[] | null; // Only visible if mySeatIndex === declarerSeat during TALON_AND_DECLARATION
  currentTrick: PlayedCard[];
  trickLeadSeat: number;
  lastTrick: Trick | null;
  declarerCardPoints: number;
  defenderCardPoints: number;
  biddingState: BiddingState;
  lastRoundResult: RoundResult | null;
  matchResult: MatchResult | null;
  legalCardIdsToPlay: string[]; // Server-calculated valid cards for current turn player
  timer: GameTimerState;
}

// User Profile & Leaderboard
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  lifetimeScore: number;
  eloRating: number;
  matchesPlayed: number;
  matchesWon: number;
  soloGamesPlayed: number;
  soloGamesWon: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  lifetimeScore: number;
  eloRating: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  soloGamesPlayed: number;
  soloGamesWon: number;
  soloWinRate: number;
}

export interface MatchListItem {
  id: string;
  code: string;
  hostUsername: string;
  isPrivate: boolean;
  status: MatchStatus;
  totalRounds: number;
  currentRound: number;
  playerCount: number;
  createdAt: string;
  timerConfig?: GameTimerConfig;
}

// Socket.io Typed Events
export interface ServerToClientEvents {
  'game:state_sync': (state: SanitizedGameState) => void;
  'game:trick_completed': (payload: { trick: Trick; delayMs: number }) => void;
  'game:round_ended': (payload: RoundResult) => void;
  'game:match_completed': (payload: MatchResult) => void;
  'game:error': (payload: { message: string }) => void;
  'match:connection_status': (payload: { seatIndex: number; isOnline: boolean }) => void;
  'chat:new_message': (payload: ChatMessage) => void;
}

export interface ClientToServerEvents {
  'game:join_match': (payload: { matchId: string }) => void;
  'game:bid': (payload: {
    matchId: string;
    action: 'open' | 'raise' | 'hold' | 'pass';
    bidValue?: number;
  }) => void;
  'game:talon_action': (payload: {
    matchId: string;
    action: 'take_talon' | 'declare_hand' | 'discard_and_declare';
    discardedCardIds?: string[];
    selectedMode?: number;
  }) => void;
  'game:play_card': (payload: { matchId: string; cardId: string }) => void;
  'game:next_round': (payload: { matchId: string }) => void;
  'game:add_bot': (payload: { matchId: string; seatIndex: number }) => void;
  'game:remove_bot': (payload: { matchId: string; seatIndex: number }) => void;
  'chat:send_message': (payload: { matchId: string; text: string }) => void;
}

// REST API Request / Response Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface GoogleAuthRequest {
  credential?: string;
  mockGoogleUser?: {
    email: string;
    name: string;
    googleId: string;
    picture?: string;
  };
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  senderSeat: number; // 0, 1, 2 or -1
  isBot?: boolean;
  text: string;
  createdAt: number;
}

export interface CreateMatchRequest {
  totalRounds: number;
  isPrivate: boolean;
  timerEnabled?: boolean;
  turnTimeLimit?: number;
  totalTimeBank?: number;
  chatEnabled?: boolean;
}

// Bot Strategy & Evolutionary Self-Play Types
export interface BotStrategyWeights {
  name?: string;
  generation?: number;
  colorGameMinTrumpCount: number; // default: 4
  colorGameMinPower: number; // default: 26
  bettlMaxDangerousCards: number; // default: 3
  bettlMinLowCards: number; // default: 5
  mordMinAces: number; // default: 2
  mordMinMasters: number; // default: 5
  trumpLeadTendency: number; // default: 1.0 (weight for leading trump cards as declarer)
  smearAggression: number; // default: 1.0 (weight for smearing high points to partner)
  discardTrumpRetention: number; // default: 2.0 (preference to preserve trumps during discard)
  discardBlankSuitBonus: number; // default: 15 (bonus for voiding a side suit)
  secondPlayerTakeLeadAggression: number; // default: 1.0 (eagerness to win trick as 2nd player)
}

export interface BotTournamentResult {
  generation: number;
  totalGamesPlayed: number;
  champion: BotStrategyWeights;
  rankings: Array<{
    botName: string;
    wins: number;
    pointsDelta: number;
    winRate: number;
    soloWinRate: number;
    fitness: number;
    weights: BotStrategyWeights;
  }>;
}
