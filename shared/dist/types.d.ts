export type Suit = 'EICHEL' | 'LAUB' | 'SCHELL' | 'HERZ';
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
export declare const GAME_TYPE_CONFIGS: Record<GameType, GameTypeConfig>;
export interface Card {
    id: string;
    suit: Suit;
    rank: CardRank;
    points: number;
    name: string;
    shortName: string;
}
export type GameMode = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export declare const GAME_MODE_INFO: Record<GameMode, {
    name: string;
    description: string;
    baseValue: number;
    trumpSuit: Suit | null;
    isBettl: boolean;
    isMord: boolean;
    noTalonAllowed: boolean;
}>;
export type GamePhase = 'WAITING_FOR_PLAYERS' | 'DEALING' | 'BIDDING' | 'TALON_AND_DECLARATION' | 'TRICK_PLAY' | 'ROUND_SUMMARY' | 'MATCH_COMPLETED';
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
    holderSeat: number | null;
    challengerSeat: number | null;
    currentTurnSeat: number;
    passedSeats: number[];
    history: BiddingHistoryEntry[];
}
export interface PlayedCard {
    seatIndex: number;
    card: Card;
}
export interface Trick {
    trickNumber: number;
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
    score: number;
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
    reason: string;
    scoresAfterRound: {
        seatIndex: number;
        score: number;
    }[];
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
export interface GameTimerConfig {
    enabled: boolean;
    turnTimeLimit: number;
    totalTimeBank: number;
}
export interface GameTimerState {
    config: GameTimerConfig;
    turnStartedAt: number | null;
    turnDuration: number;
    playerBanks: [number, number, number];
}
export type WattenGameMode = 'OFFEN' | 'BLIND' | 'KRITISCH' | 'LADINISCH';
export interface WattenOptions {
    targetScore: 11 | 15 | 18;
    hasGueter: boolean;
    hasSupergueter: boolean;
    weliRole: 'kleinster_trumpf' | 'kleinster_schell';
}
export interface SchnapsenOptions {
    targetBummerl: 1 | 2 | 3;
    subMode3?: 'DREIERSCHNAPSEN_3P' | 'MITSCHREIBEN_3P';
    allowZudrehen: boolean;
    allowTrumpfTausch: boolean;
    schneiderBummerl: boolean;
}
export interface WattenState {
    schlag: CardRank | null;
    farbe: Suit | null;
    schlagChooserSeat: number;
    farbeChooserSeat: number;
    currentBet: number;
    betChallengerSeat: number | null;
    betPending: boolean;
    lastBettingTeam?: number | null;
    teamTricksWon: [number, number];
    targetScore?: number;
    mode?: WattenGameMode;
    isGestrichen?: [boolean, boolean];
    esGehenDieVier?: boolean;
    esGehenDieVierPendingTeam?: number | null;
    cutCard?: Card | null;
    weliHasGueter?: boolean;
    weliIsAlwaysLowestTrump?: boolean;
    gueterMustFollowTrump?: boolean;
    pointsOnGehenWhenGestrichen?: number;
    hasGueter?: boolean;
    hasSupergueter?: boolean;
    weliRole?: 'kleinster_trumpf' | 'kleinster_schell';
}
export type SchnapsenMode = 'CLASSIC_2P' | 'MITSCHREIBEN_3P' | 'DREIERSCHNAPSEN_3P' | 'BAUERNSCHNAPSEN_4P';
export type SchnapsenCallType = 'RUFER' | 'BETTLER' | 'ASSBETTLER' | 'SCHNAPSER' | 'GANGL' | 'ZEHNERLOCH' | 'KONTRASCHNAPSER' | 'BAUERNSCHNAPSER' | 'HERRENGANGL' | 'KONTRABAUERNSCHNAPSER' | 'HERRENSCHNAPSER';
export type SchnapsenPhase = 'DEALING' | 'ATOUT_SELECTION' | 'BIDDING' | 'TALON_EXCHANGE' | 'TRICK_PLAY' | 'SCORING';
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
export declare const SCHNAPSEN_CALL_CONFIG: Record<SchnapsenCallType, SchnapsenCallDefinition>;
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
    trumpCard: Card | null;
    stockCount: number;
    talonClosed: boolean;
    talonClosedBySeat: number | null;
    talonClosedOpponentEyes?: number;
    talonClosedOpponentTricks?: number;
    marriages: SchnapsenMarriage[];
    playerEyes: number[];
    countdownScores?: number[];
    declared66Seat: number | null;
    mode3?: Schnapsen3Mode;
    targetEyes?: number;
    declarerSeat?: number | null;
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
    talon: Card[];
    discardedCards: Card[];
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
    mySeatIndex: number | null;
    players: SanitizedPlayerSeat[];
    myHand: Card[];
    talonCount: number;
    talonCards: Card[] | null;
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
    legalCardIdsToPlay: string[];
    timer: GameTimerState;
}
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
export interface ServerToClientEvents {
    'game:state_sync': (state: SanitizedGameState) => void;
    'game:trick_completed': (payload: {
        trick: Trick;
        delayMs: number;
    }) => void;
    'game:round_ended': (payload: RoundResult) => void;
    'game:match_completed': (payload: MatchResult) => void;
    'game:error': (payload: {
        message: string;
    }) => void;
    'match:connection_status': (payload: {
        seatIndex: number;
        isOnline: boolean;
    }) => void;
    'chat:new_message': (payload: ChatMessage) => void;
}
export interface ClientToServerEvents {
    'game:join_match': (payload: {
        matchId: string;
    }) => void;
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
    'game:play_card': (payload: {
        matchId: string;
        cardId: string;
    }) => void;
    'game:next_round': (payload: {
        matchId: string;
    }) => void;
    'game:add_bot': (payload: {
        matchId: string;
        seatIndex: number;
    }) => void;
    'game:remove_bot': (payload: {
        matchId: string;
        seatIndex: number;
    }) => void;
    'game:surrender': (payload: {
        matchId: string;
        surrenderType?: 'round' | 'match';
    }) => void;
    'game:watten_action': (payload: {
        matchId: string;
        action: 'choose_schlag' | 'choose_farbe' | 'bet' | 'hold' | 'fold' | 'es_gehen_die_vier_response' | 'schlagtausch';
        schlag?: CardRank;
        farbe?: Suit;
        decision?: 'hold' | 'fold';
    }) => void;
    'game:schnapsen_action': (payload: {
        matchId: string;
        action: 'announce_marriage' | 'swap_trump' | 'close_talon' | 'declare_mode' | 'declare_66' | 'select_atout' | 'reveal_card' | 'redeal_3_buben' | 'bid' | 'pass' | 'kontra' | 'exchange_talon';
        suit?: Suit;
        mode?: Schnapsen3Mode;
        callType?: SchnapsenCallType;
        cardIndex?: number;
        discardIds?: string[];
    }) => void;
    'chat:send_message': (payload: {
        matchId: string;
        text: string;
    }) => void;
}
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
    senderSeat: number;
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
export interface BotStrategyWeights {
    name?: string;
    generation?: number;
    colorGameMinTrumpCount: number;
    colorGameMinPower: number;
    bettlMaxDangerousCards: number;
    bettlMinLowCards: number;
    mordMinAces: number;
    mordMinMasters: number;
    trumpLeadTendency: number;
    smearAggression: number;
    discardTrumpRetention: number;
    discardBlankSuitBonus: number;
    secondPlayerTakeLeadAggression: number;
    vacuumBonusMultiplier?: number;
    bettlDangerThreshold?: number;
    doppelbettlDangerThreshold?: number;
    mordMaxStopperHoles?: number;
    explorationTemperature?: number;
    useISMCTS?: boolean;
    ismctsIterations?: number;
    ismctsExploration?: number;
    useNeuralNetwork?: boolean;
    neuralNetworkWeight?: number;
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
