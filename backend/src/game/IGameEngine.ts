import {
  Card,
  FullGameState,
  GameMode,
  GameTimerConfig,
  GameType,
  MatchResult,
  Suit,
} from '@spielfranzen/shared';

export interface TrickPlayResult {
  state: FullGameState;
  trickCompleted: boolean;
  roundEnded: boolean;
}

export interface IGameEngine {
  readonly gameType: GameType;

  createInitialState(
    matchId: string,
    code: string,
    totalRounds: number,
    players: { userId: string; username: string; isBot: boolean }[],
    timerConfig?: GameTimerConfig,
    chatEnabled?: boolean,
    matchName?: string,
    options?: any,
  ): FullGameState;

  startNewRound(state: FullGameState): FullGameState;

  getLegalCardsToPlay(state: FullGameState, seatIndex: number): Card[];

  handlePlayCard(state: FullGameState, seatIndex: number, cardId: string): TrickPlayResult;

  clearCurrentTrick(state: FullGameState): FullGameState;

  handleSurrender(
    state: FullGameState,
    seatIndex: number,
    surrenderType?: 'round' | 'match',
  ): FullGameState;

  advanceToNextRound(state: FullGameState): FullGameState;

  computeMatchResult(state: FullGameState): MatchResult;
}
