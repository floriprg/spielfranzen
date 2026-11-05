// Suit types for the German 33-card Bavarian deck
export type Suit = 'EICHEL' | 'LAUB' | 'SCHELL' | 'HERZ';

// Card Rank (1 = Weli, 2..9 = 7, 8, 9, Unter, Ober, König, 10, Ass)
export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type GameType = 'franzen' | 'watten_2' | 'watten_4' | 'schnapsen_2' | 'schnapsen_3' | 'schnapsen_4';

export interface GameTypeConfig {
  id: GameType;
  name: string;
  shortName: string;
  description: string;
  playerCount: number;
  deckSize: 20 | 24 | 33;
  handSize: number;
  hasTeams: boolean;
}

export const GAME_TYPE_CONFIGS: Record<GameType, GameTypeConfig> = {
  franzen: {
    id: 'franzen',
    name: 'Franzen (3 Spieler)',
    shortName: 'Franzen',
    description: 'Bayerisches Traditionsspiel für 3 Spieler mit 33 Karten (inkl. Weli), Reizen und Talon.',
    playerCount: 3,
    deckSize: 33,
    handSize: 10,
    hasTeams: false,
  },
  watten_2: {
    id: 'watten_2',
    name: 'Watten (2 Spieler)',
    shortName: 'Watten (2er)',
    description: 'Klassisches 1-gegen-1 Kartenduell mit 33 Karten, Schlag & Farbe sowie Bieten („Schlagta!“).',
    playerCount: 2,
    deckSize: 33,
    handSize: 5,
    hasTeams: false,
  },
  watten_4: {
    id: 'watten_4',
    name: 'Watten (4 Spieler)',
    shortName: 'Watten (4er)',
    description: 'Das beliebte 4er-Watten im 2-gegen-2 Team über Kreuz. Zusammenspiel, Deuten und Schlagen.',
    playerCount: 4,
    deckSize: 33,
    handSize: 5,
    hasTeams: true,
  },
  schnapsen_2: {
    id: 'schnapsen_2',
    name: 'Schnapsen (2 Spieler)',
    shortName: 'Schnapsen',
    description: 'Österreichisches 1-gegen-1 mit 20 Karten. Ziel: 66 Augen, Ansagen (20/40), Zudrehen und Bummerl.',
    playerCount: 2,
    deckSize: 20,
    handSize: 5,
    hasTeams: false,
  },
  schnapsen_3: {
    id: 'schnapsen_3',
    name: 'Dreierschnapsen (3 Spieler)',
    shortName: 'Dreierschnapsen',
    description: 'Echtes Dreierschnapsen mit 20 Karten, Talon & Lizitation. Jeder gegen jeden von 24 auf 0.',
    playerCount: 3,
    deckSize: 20,
    handSize: 6,
    hasTeams: false,
  },
  schnapsen_4: {
    id: 'schnapsen_4',
    name: 'Bauernschnapsen (4 Spieler)',
    shortName: 'Bauernschnapsen (4er)',
    description: 'Klassisches Viererschnapsen im 2-gegen-2 Team mit 20 Karten und Lizitation.',
    playerCount: 4,
    deckSize: 20,
    handSize: 5,
    hasTeams: true,
  },
};

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
  isSchneider?: boolean;
  bummerlCount?: number;
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

export type WattenGameMode = 'OFFEN' | 'BLIND' | 'KRITISCH' | 'LADINISCH';

export interface WattenOptions {
  targetScore: 11 | 15 | 18; // default 15
  hasGueter: boolean; // default true
  hasSupergueter: boolean; // default false
  weliRole: 'kleinster_trumpf' | 'kleinster_schell'; // default 'kleinster_trumpf'
}

export interface SchnapsenOptions {
  targetBummerl: 1 | 2 | 3; // default 1
  subMode3?: 'DREIERSCHNAPSEN_3P' | 'MITSCHREIBEN_3P'; // for schnapsen_3, default 'DREIERSCHNAPSEN_3P'
  allowZudrehen: boolean; // default true
  allowTrumpfTausch: boolean; // default true
  schneiderBummerl: boolean; // default true
}

export interface WattenState {
  schlag: CardRank | null; // e.g. 9 for Ass, 6 for Ober
  farbe: Suit | null; // e.g. 'HERZ'
  schlagChooserSeat: number;
  farbeChooserSeat: number;
  currentBet: number; // 2, 3, 4 ... points
  betChallengerSeat: number | null;
  betPending: boolean;
  lastBettingTeam?: number | null; // 0 for Team A, 1 for Team B
  teamTricksWon: [number, number]; // [Team A (seats 0,2), Team B (seats 1,3)]
  targetScore?: number; // 11, 15, or 18 (default 15)
  mode?: WattenGameMode;
  isGestrichen?: [boolean, boolean]; // whether Team A / Team B is gestrichen (score >= targetScore - 2)
  esGehenDieVier?: boolean; // special "Es gehen die Vier" mode active
  esGehenDieVierPendingTeam?: number | null; // team that must respond
  cutCard?: Card | null; // bottom card revealed during cut
  weliHasGueter?: boolean;
  weliIsAlwaysLowestTrump?: boolean;
  gueterMustFollowTrump?: boolean;
  pointsOnGehenWhenGestrichen?: number; // default 2
  hasGueter?: boolean;
  hasSupergueter?: boolean;
  weliRole?: 'kleinster_trumpf' | 'kleinster_schell';
}

export type SchnapsenMode =
  | 'CLASSIC_2P'
  | 'MITSCHREIBEN_3P'
  | 'DREIERSCHNAPSEN_3P'
  | 'BAUERNSCHNAPSEN_4P';

export type SchnapsenCallType =
  | 'RUFER'
  | 'BETTLER'
  | 'ASSBETTLER'
  | 'SCHNAPSER'
  | 'GANGL'
  | 'ZEHNERLOCH'
  | 'KONTRASCHNAPSER'
  | 'BAUERNSCHNAPSER'
  | 'HERRENGANGL'
  | 'KONTRABAUERNSCHNAPSER'
  | 'HERRENSCHNAPSER';

export type SchnapsenPhase =
  | 'DEALING'
  | 'ATOUT_SELECTION'
  | 'BIDDING'
  | 'TALON_EXCHANGE'
  | 'TRICK_PLAY'
  | 'SCORING';

export type TalonState = 'TALON_OPEN' | 'TALON_CLOSED';

export type SchnapsenKontraLevel = 1 | 2 | 4 | 8;

export interface SchnapsenCallDefinition {
  name: string;
  points: number;
  hasTrump: boolean;
  leadByVorhand: boolean;
  isNegative: boolean;
  isAllTricks: boolean;
  isThreeTricks: boolean;
  isAufgelegt: boolean;
  allowedFor3P: boolean;
  canBeKontriert: boolean;
}

export const SCHNAPSEN_CALL_CONFIG: Record<SchnapsenCallType, SchnapsenCallDefinition> = {
  RUFER: {
    name: 'Einfacher Rufer',
    points: 1,
    hasTrump: true,
    leadByVorhand: true,
    isNegative: false,
    isAllTricks: false,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  BETTLER: {
    name: 'Bettler',
    points: 5,
    hasTrump: false,
    leadByVorhand: false,
    isNegative: true,
    isAllTricks: false,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  ASSBETTLER: {
    name: 'Assbettler',
    points: 6,
    hasTrump: false,
    leadByVorhand: false,
    isNegative: true,
    isAllTricks: false,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  SCHNAPSER: {
    name: 'Schnapser (Drei-Stich)',
    points: 6,
    hasTrump: true,
    leadByVorhand: true,
    isNegative: false,
    isAllTricks: false,
    isThreeTricks: true,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  GANGL: {
    name: 'Durchmarsch (Gangl)',
    points: 9,
    hasTrump: false,
    leadByVorhand: false,
    isNegative: false,
    isAllTricks: true,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  ZEHNERLOCH: {
    name: 'Zehnerloch',
    points: 10,
    hasTrump: false,
    leadByVorhand: false,
    isNegative: false,
    isAllTricks: true,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  KONTRASCHNAPSER: {
    name: 'Kontraschnapser',
    points: 12,
    hasTrump: true,
    leadByVorhand: true,
    isNegative: false,
    isAllTricks: false,
    isThreeTricks: true,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  BAUERNSCHNAPSER: {
    name: 'Bauernschnapser',
    points: 12,
    hasTrump: true,
    leadByVorhand: true,
    isNegative: false,
    isAllTricks: true,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: true,
  },
  HERRENGANGL: {
    name: 'Herrengangl',
    points: 18,
    hasTrump: false,
    leadByVorhand: false,
    isNegative: false,
    isAllTricks: true,
    isThreeTricks: false,
    isAufgelegt: true,
    allowedFor3P: false,
    canBeKontriert: false,
  },
  KONTRABAUERNSCHNAPSER: {
    name: 'Kontrabauernschnapser',
    points: 24,
    hasTrump: true,
    leadByVorhand: true,
    isNegative: false,
    isAllTricks: true,
    isThreeTricks: false,
    isAufgelegt: false,
    allowedFor3P: true,
    canBeKontriert: false,
  },
  HERRENSCHNAPSER: {
    name: 'Herrenschnapser',
    points: 24,
    hasTrump: true,
    leadByVorhand: true,
    isNegative: false,
    isAllTricks: true,
    isThreeTricks: false,
    isAufgelegt: true,
    allowedFor3P: false,
    canBeKontriert: false,
  },
};

export interface SchnapsenMarriage {
  seatIndex: number;
  suit: Suit;
  points: 20 | 40;
}

export type Schnapsen3Mode = 'NORMAL' | 'BETTLER' | 'SCHNAPSER' | 'GANGL' | 'BAUERNSCHNAPSER';

export interface SchnapsenState {
  mode: SchnapsenMode;
  schnapsenPhase: SchnapsenPhase;
  talonState: TalonState;
  trumpSuit: Suit;
  trumpCard: Card | null; // face-up card under stock (2P)
  stockCount: number; // cards remaining in stock (2P)
  talonClosed: boolean; // turned / closed by player (2P)
  talonClosedBySeat: number | null;
  talonClosedOpponentEyes?: number; // opponent eyes at moment of closing
  talonClosedOpponentTricks?: number; // opponent tricks at moment of closing
  marriages: SchnapsenMarriage[];
  playerEyes: number[]; // points counted for each player (or team)
  countdownScores?: number[]; // start 7 (2P/mitschreiben) or 24 (3P/4P)
  declared66Seat: number | null;
  mode3?: Schnapsen3Mode;
  targetEyes?: number; // 66
  declarerSeat?: number | null; // For 3er / 4er Schnapsen
  callType?: SchnapsenCallType;
  kontraLevel: SchnapsenKontraLevel;
  kontraSeat?: number | null;
  atoutSelection?: {
    first3Cards?: Card[];
    cardRevealed?: Card | null;
    canRedeal3Buben?: boolean;
    step?: 'FIRST_3' | 'DONE';
  };
  biddingHistory?: {
    seatIndex: number;
    callType: SchnapsenCallType | 'PASS' | 'KONTRA';
  }[];
  consecutivePasses?: number;
  highestBidSeat?: number | null;
  firstTrickVorhandMarriageSuit?: Suit | null;
  firstTrickVorhandMarriageSeat?: number | null;
  pendingMarriageSuit?: Suit | null;
  pausedDealerSeat?: number | null;
  targetBummerl?: 1 | 2 | 3;
  bummerlsWon?: number[];
  allowZudrehen?: boolean;
  allowTrumpfTausch?: boolean;
  schneiderBummerl?: boolean;
}

// Full Server-Side State (Stored in DB JSONB and in memory)
export interface FullGameState {
  matchId: string;
  code: string;
  name?: string;
  gameType?: GameType;
  maxPlayers?: number;
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
  players: PlayerSeatState[];
  hands: Card[][];
  talon: Card[]; // 3 cards
  discardedCards: Card[]; // 3 cards discarded by declarer
  biddingState: BiddingState;
  wattenState?: WattenState;
  schnapsenState?: SchnapsenState;
  wattenOptions?: WattenOptions;
  schnapsenOptions?: SchnapsenOptions;
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
  name?: string;
  gameType?: GameType;
  maxPlayers?: number;
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
  players: SanitizedPlayerSeat[];
  myHand: Card[]; // Only the requesting player's hand!
  talonCount: number;
  talonCards: Card[] | null; // Only visible if mySeatIndex === declarerSeat during TALON_AND_DECLARATION
  wattenState?: WattenState;
  schnapsenState?: SchnapsenState;
  wattenOptions?: WattenOptions;
  schnapsenOptions?: SchnapsenOptions;
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

export interface MatchParticipantSummary {
  seatIndex: number;
  userId: string;
  username: string;
  isBot: boolean;
  isHost: boolean;
}

export interface MatchListItem {
  id: string;
  code: string;
  name?: string;
  gameType?: GameType;
  maxPlayers?: number;
  hostUsername: string;
  isPrivate: boolean;
  status: MatchStatus;
  totalRounds: number;
  currentRound: number;
  playerCount: number;
  createdAt: string;
  timerConfig?: GameTimerConfig;
  players?: MatchParticipantSummary[];
  wattenOptions?: WattenOptions;
  schnapsenOptions?: SchnapsenOptions;
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
  'game:surrender': (payload: { matchId: string; surrenderType?: 'round' | 'match' }) => void;
  'game:watten_action': (payload: {
    matchId: string;
    action: 'choose_schlag' | 'choose_farbe' | 'bet' | 'hold' | 'fold' | 'es_gehen_die_vier_response' | 'schlagtausch';
    schlag?: CardRank;
    farbe?: Suit;
    decision?: 'hold' | 'fold';
  }) => void;
  'game:schnapsen_action': (payload: {
    matchId: string;
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
      | 'exchange_talon';
    suit?: Suit;
    mode?: Schnapsen3Mode;
    callType?: SchnapsenCallType;
    cardIndex?: number;
    discardIds?: string[];
  }) => void;
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
  name?: string;
  gameType?: GameType;
  maxPlayers?: number;
  totalRounds: number;
  isPrivate: boolean;
  timerEnabled?: boolean;
  turnTimeLimit?: number;
  totalTimeBank?: number;
  chatEnabled?: boolean;
  wattenOptions?: WattenOptions;
  schnapsenOptions?: SchnapsenOptions;
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

  // Advanced mathematical & game-theoretic parameters from strategy paper:
  vacuumBonusMultiplier?: number; // default: 0.8 (bonus for discarding points in vacuum trap)
  bettlDangerThreshold?: number; // default: 18 (sum of D_Farbe below which Bettl is chosen)
  doppelbettlDangerThreshold?: number; // default: 8 (sum of D_Farbe below which Doppelbettl is chosen)
  mordMaxStopperHoles?: number; // default: 0 (or 1 with >= 8 top tricks)
  explorationTemperature?: number; // default: 0.15 (stochastic temperature for non-deterministic AI play)

  // Information Set Monte Carlo Tree Search (ISMCTS):
  useISMCTS?: boolean; // default: true
  ismctsIterations?: number; // default: 120 (iterations per search)
  ismctsExploration?: number; // default: 0.75 (UCB1 exploration constant C)

  // Deep Reinforcement Learning (Masked PPO ONNX Policy):
  useNeuralNetwork?: boolean; // default: true
  neuralNetworkWeight?: number; // default: 80 (influence weight of ONNX policy prior in ISMCTS and decision fusion)
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
