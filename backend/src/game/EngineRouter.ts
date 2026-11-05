import {
  Card,
  FullGameState,
  GameTimerConfig,
  GameType,
  MatchResult,
  SchnapsenOptions,
  WattenOptions,
} from '@spielfranzen/shared';
import { GameEngine } from './GameEngine.js';
import { IGameEngine, TrickPlayResult } from './IGameEngine.js';
import { SchnapsenEngine } from './SchnapsenEngine.js';
import { WattenEngine } from './WattenEngine.js';

/**
 * Adapter wrapping the legacy/existing Franzen GameEngine without touching its code.
 */
class FranzenEngineAdapter implements IGameEngine {
  public readonly gameType: GameType = 'franzen';

  public createInitialState(
    matchId: string,
    code: string,
    totalRounds: number,
    players: { userId: string; username: string; isBot: boolean }[],
    timerConfig?: GameTimerConfig,
    chatEnabled?: boolean,
    matchName?: string,
  ): FullGameState {
    const state = GameEngine.createInitialState(
      matchId,
      code,
      totalRounds,
      players as [any, any, any],
      timerConfig,
      chatEnabled,
      matchName,
    );
    state.gameType = 'franzen';
    state.maxPlayers = 3;
    return state;
  }

  public startNewRound(state: FullGameState): FullGameState {
    return GameEngine.startNewRound(state);
  }

  public getLegalCardsToPlay(state: FullGameState, seatIndex: number): Card[] {
    return GameEngine.getLegalCardsToPlay(state, seatIndex);
  }

  public handlePlayCard(
    state: FullGameState,
    seatIndex: number,
    cardId: string,
  ): TrickPlayResult {
    return GameEngine.handlePlayCard(state, seatIndex, cardId);
  }

  public clearCurrentTrick(state: FullGameState): FullGameState {
    GameEngine.clearCurrentTrick(state);
    return state;
  }

  public handleSurrender(
    state: FullGameState,
    seatIndex: number,
    surrenderType?: 'round' | 'match',
  ): FullGameState {
    return GameEngine.handleSurrender(state, seatIndex, surrenderType);
  }

  public advanceToNextRound(state: FullGameState): FullGameState {
    return GameEngine.advanceToNextRound(state);
  }

  public computeMatchResult(state: FullGameState): MatchResult {
    return GameEngine.computeMatchResult(state);
  }
}

/**
 * Central Engine Router that delegates dynamically based on gameType.
 */
export class EngineRouter {
  private static readonly franzen = new FranzenEngineAdapter();
  private static readonly watten2 = new WattenEngine('watten_2');
  private static readonly watten4 = new WattenEngine('watten_4');
  private static readonly schnapsen2 = new SchnapsenEngine('schnapsen_2');
  private static readonly schnapsen3 = new SchnapsenEngine('schnapsen_3');
  private static readonly schnapsen4 = new SchnapsenEngine('schnapsen_4');

  public static getEngine(gameType: GameType = 'franzen'): IGameEngine {
    switch (gameType) {
      case 'watten_2':
        return EngineRouter.watten2;
      case 'watten_4':
        return EngineRouter.watten4;
      case 'schnapsen_2':
        return EngineRouter.schnapsen2;
      case 'schnapsen_3':
        return EngineRouter.schnapsen3;
      case 'schnapsen_4':
        return EngineRouter.schnapsen4;
      case 'franzen':
      default:
        return EngineRouter.franzen;
    }
  }

  public static createInitialState(
    gameType: GameType,
    matchId: string,
    code: string,
    totalRounds: number,
    players: { userId: string; username: string; isBot: boolean }[],
    timerConfig?: GameTimerConfig,
    chatEnabled?: boolean,
    matchName?: string,
    wattenOptions?: WattenOptions,
    schnapsenOptions?: SchnapsenOptions,
  ): FullGameState {
    if (gameType === 'watten_2' || gameType === 'watten_4') {
      const engine = gameType === 'watten_2' ? EngineRouter.watten2 : EngineRouter.watten4;
      return engine.createInitialState(
        matchId,
        code,
        totalRounds,
        players,
        timerConfig,
        chatEnabled,
        matchName,
        wattenOptions,
      );
    }
    if (gameType.startsWith('schnapsen')) {
      const engine =
        gameType === 'schnapsen_2'
          ? EngineRouter.schnapsen2
          : gameType === 'schnapsen_4'
          ? EngineRouter.schnapsen4
          : EngineRouter.schnapsen3;
      return engine.createInitialState(
        matchId,
        code,
        totalRounds,
        players,
        timerConfig,
        chatEnabled,
        matchName,
        schnapsenOptions,
      );
    }
    const engine = EngineRouter.franzen;
    return engine.createInitialState(
      matchId,
      code,
      totalRounds,
      players,
      timerConfig,
      chatEnabled,
      matchName,
    );
  }

  public static startNewRound(state: FullGameState): FullGameState {
    return EngineRouter.getEngine(state.gameType).startNewRound(state);
  }

  public static getLegalCardsToPlay(state: FullGameState, seatIndex: number): Card[] {
    return EngineRouter.getEngine(state.gameType).getLegalCardsToPlay(state, seatIndex);
  }

  public static handlePlayCard(
    state: FullGameState,
    seatIndex: number,
    cardId: string,
  ): TrickPlayResult {
    return EngineRouter.getEngine(state.gameType).handlePlayCard(state, seatIndex, cardId);
  }

  public static clearCurrentTrick(state: FullGameState): FullGameState {
    return EngineRouter.getEngine(state.gameType).clearCurrentTrick(state);
  }

  public static handleSurrender(
    state: FullGameState,
    seatIndex: number,
    surrenderType?: 'round' | 'match',
  ): FullGameState {
    return EngineRouter.getEngine(state.gameType).handleSurrender(state, seatIndex, surrenderType);
  }

  public static advanceToNextRound(state: FullGameState): FullGameState {
    return EngineRouter.getEngine(state.gameType).advanceToNextRound(state);
  }

  public static computeMatchResult(state: FullGameState): MatchResult {
    return EngineRouter.getEngine(state.gameType).computeMatchResult(state);
  }
}
