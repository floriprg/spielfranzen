import {
  Card,
  GameMode,
  GAME_MODE_INFO,
  Suit,
  FullGameState,
  BotStrategyWeights,
} from '@spielfranzen/shared';
import { GameEngine } from './GameEngine.js';
import { getLegalCardIds } from './sanitizer.js';
import { BotEngine, BotDeductions } from './BotEngine.js';

export interface ISMCTSResult {
  bestCardId: string;
  cardStats: Map<
    string,
    {
      visits: number;
      winRate: number;
      mctsScore: number;
      nnPrior?: number;
      combinedScore: number;
    }
  >;
  iterationsRun: number;
  timeMs: number;
}

interface SimPlayerCard {
  seatIndex: number;
  card: Card;
}

interface SimState {
  hands: [Card[], Card[], Card[]];
  currentTrick: SimPlayerCard[];
  turnSeat: number;
  declarerSeat: number;
  gameMode: GameMode;
  trumpSuit?: Suit;
  declarerCardPoints: number;
  defenderCardPoints: number;
  tricksPlayed: number;
  declarerTricksWon: number;
  defenderTricksWon: number;
}

export class ISMCTSNode {
  public seatToMove: number;
  public cardPlayed?: Card;
  public parent: ISMCTSNode | null;
  public children: Map<string, ISMCTSNode> = new Map();
  public visits = 0;
  public actionAvailCount: Map<string, number> = new Map();
  public actionVisits: Map<string, number> = new Map();
  public actionWins: Map<string, number> = new Map();

  constructor(seatToMove: number, cardPlayed?: Card, parent: ISMCTSNode | null = null) {
    this.seatToMove = seatToMove;
    this.cardPlayed = cardPlayed;
    this.parent = parent;
  }
}

/**
 * Information Set Monte Carlo Tree Search (Single-Observer ISMCTS) for Franzen.
 * Accurately models hidden information, opponent void constraints, and future trick dynamics.
 */
export class ISMCTSEngine {
  /**
   * Executes SO-ISMCTS search for the given game state and seat.
   */
  public static search(
    state: FullGameState,
    seatIndex: number,
    weights: BotStrategyWeights = BotEngine.getChampionWeights(),
    maxIterations = 140,
    maxTimeMs = 80,
    nnPriors?: Map<string, number> | null,
  ): ISMCTSResult {
    const startTime = Date.now();
    const myHand = state.hands[seatIndex]!;
    const legalCardIds = getLegalCardIds(myHand, state.currentTrick, state.gameMode);

    if (legalCardIds.length === 0) {
      throw new Error(`ISMCTS: No legal cards for seat ${seatIndex}`);
    }

    if (legalCardIds.length === 1) {
      const singleCardId = legalCardIds[0]!;
      const cardStats = new Map<
        string,
        {
          visits: number;
          winRate: number;
          mctsScore: number;
          nnPrior?: number;
          combinedScore: number;
        }
      >();
      const prior = nnPriors?.get(singleCardId) ?? 1.0;
      cardStats.set(singleCardId, {
        visits: 1,
        winRate: 1.0,
        mctsScore: 100,
        nnPrior: prior,
        combinedScore: 100 + prior * 80,
      });
      return {
        bestCardId: singleCardId,
        cardStats,
        iterationsRun: 0,
        timeMs: 0,
      };
    }

    const deductions = BotEngine.deduceGameState(state, seatIndex);
    const root = new ISMCTSNode(seatIndex, undefined, null);
    const explorationC = weights.ismctsExploration ?? 0.75;
    const iterationsTarget = weights.ismctsIterations ?? maxIterations;

    let iterationsRun = 0;

    for (let it = 0; it < iterationsTarget; it++) {
      if (Date.now() - startTime > maxTimeMs && it >= 40) {
        break;
      }

      // 1. Determinization: Sample consistent hidden hands
      const simState = ISMCTSEngine.determinize(state, seatIndex, deductions);

      // 2. Selection & Expansion
      let currNode = root;
      while (!ISMCTSEngine.isTerminal(simState)) {
        const legalIds = getLegalCardIds(
          simState.hands[simState.turnSeat]!,
          simState.currentTrick,
          simState.gameMode,
        );

        if (legalIds.length === 0) break;

        // Update availability for all legal moves in this determinization
        for (const actionId of legalIds) {
          currNode.actionAvailCount.set(
            actionId,
            (currNode.actionAvailCount.get(actionId) || 0) + 1,
          );
        }

        // Check for untried moves
        const untried = legalIds.filter((id) => !currNode.children.has(id));
        if (untried.length > 0) {
          // Expansion: pick an untried action (prioritizing higher ONNX prior at root)
          let chosenActionId = untried[0]!;
          if (currNode === root && nnPriors && nnPriors.size > 0) {
            let maxP = -1;
            for (const uid of untried) {
              const p = nnPriors.get(uid) ?? 0;
              if (p > maxP) {
                maxP = p;
                chosenActionId = uid;
              }
            }
          } else {
            chosenActionId = untried[Math.floor(Math.random() * untried.length)]!;
          }

          const handOfSeat = simState.hands[simState.turnSeat]!;
          const cardToPlay = handOfSeat.find((c) => c.id === chosenActionId)!;

          ISMCTSEngine.applyMove(simState, chosenActionId);
          const childNode = new ISMCTSNode(simState.turnSeat, cardToPlay, currNode);
          currNode.children.set(chosenActionId, childNode);
          currNode = childNode;
          break; // Move to simulation/rollout phase
        }

        // Selection: UCB1 on tried legal moves
        const isObserverTeam =
          currNode.seatToMove === state.declarerSeat
            ? seatIndex === state.declarerSeat
            : seatIndex !== state.declarerSeat;

        let bestActionId = legalIds[0]!;
        let bestUCB = -Infinity;

        for (const actionId of legalIds) {
          const nVisits = currNode.actionVisits.get(actionId) || 0;
          const nAvail = currNode.actionAvailCount.get(actionId) || 1;
          const qWins = currNode.actionWins.get(actionId) || 0;

          if (nVisits === 0) {
            bestActionId = actionId;
            break;
          }

          const rawWinRate = qWins / nVisits;
          // Observer team maximizes observer win rate; opponents minimize it
          const teamWinRate = isObserverTeam ? rawWinRate : 1.0 - rawWinRate;
          const prior = (currNode === root && nnPriors)
            ? (nnPriors.get(actionId) ?? (1.0 / legalIds.length))
            : (1.0 / legalIds.length);

          // Policy-augmented PUCT: balances simulation win-rate with neural network prior
          const ucb = teamWinRate + explorationC * (0.5 + prior) * Math.sqrt((2 * Math.log(nAvail)) / nVisits);

          if (ucb > bestUCB) {
            bestUCB = ucb;
            bestActionId = actionId;
          }
        }

        ISMCTSEngine.applyMove(simState, bestActionId);
        currNode = currNode.children.get(bestActionId)!;
      }

      // 3. Rollout / Simulation
      while (!ISMCTSEngine.isTerminal(simState)) {
        const legalRolloutIds = getLegalCardIds(
          simState.hands[simState.turnSeat]!,
          simState.currentTrick,
          simState.gameMode,
        );
        if (legalRolloutIds.length === 0) break;

        const pickedId = ISMCTSEngine.selectRolloutMove(simState, legalRolloutIds);
        ISMCTSEngine.applyMove(simState, pickedId);
      }

      // 4. Payoff from observer's perspective
      const observerPayoff = ISMCTSEngine.evaluatePayoff(simState, seatIndex);

      // 5. Backpropagation
      let backNode: ISMCTSNode | null = currNode;
      while (backNode !== null) {
        backNode.visits++;
        if (backNode.parent && backNode.cardPlayed) {
          const actionId = backNode.cardPlayed.id;
          const p = backNode.parent;
          p.actionVisits.set(actionId, (p.actionVisits.get(actionId) || 0) + 1);
          p.actionWins.set(actionId, (p.actionWins.get(actionId) || 0) + observerPayoff);
        }
        backNode = backNode.parent;
      }

      iterationsRun++;
    }

    const elapsedMs = Date.now() - startTime;
    const cardStats = new Map<
      string,
      {
        visits: number;
        winRate: number;
        mctsScore: number;
        nnPrior?: number;
        combinedScore: number;
      }
    >();

    let bestCardId = legalCardIds[0]!;
    let bestScore = -Infinity;
    const nnWeight = weights.neuralNetworkWeight ?? 80;

    for (const cardId of legalCardIds) {
      const visits = root.actionVisits.get(cardId) || 0;
      const wins = root.actionWins.get(cardId) || 0;
      const winRate = visits > 0 ? wins / visits : 0.5;
      const visitRatio = iterationsRun > 0 ? visits / iterationsRun : 0;
      const prior = nnPriors?.get(cardId) ?? 0;

      // Robust child scoring: primarily win rate, weighted by visits
      const mctsScore = winRate * 120 + visitRatio * 60;
      // Combined hybrid score incorporating tree search win rate + visits + neural policy prior
      const combinedScore = mctsScore + (prior > 0 ? prior * nnWeight : 0);
      cardStats.set(cardId, { visits, winRate, mctsScore, nnPrior: prior, combinedScore });

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestCardId = cardId;
      }
    }

    return {
      bestCardId,
      cardStats,
      iterationsRun,
      timeMs: elapsedMs,
    };
  }

  /**
   * Samples a consistent hidden-card state respecting the observer's deductions and void matrix.
   */
  public static determinize(
    state: FullGameState,
    observerSeat: number,
    deductions: BotDeductions,
  ): SimState {
    const isDeclarer = observerSeat === state.declarerSeat;
    const remainingDeck = [...deductions.unseenCards];

    // Shuffle unseen cards with Fisher-Yates
    for (let i = remainingDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = remainingDeck[i]!;
      remainingDeck[i] = remainingDeck[j]!;
      remainingDeck[j] = temp;
    }

    const hands: [Card[], Card[], Card[]] = [[], [], []];
    hands[observerSeat] = [...state.hands[observerSeat]!];

    const oppSeats = [0, 1, 2].filter((s) => s !== observerSeat);
    const targetCounts: Record<number, number> = {
      [oppSeats[0]!]: state.hands[oppSeats[0]!]!.length,
      [oppSeats[1]!]: state.hands[oppSeats[1]!]!.length,
    };

    // Partition unseen cards respecting void constraints
    const unassigned: Card[] = [];
    for (const card of remainingDeck) {
      const s1 = oppSeats[0]!;
      const s2 = oppSeats[1]!;

      const canS1 =
        hands[s1]!.length < targetCounts[s1]! && !deductions.isVoid[s1]![card.suit];
      const canS2 =
        hands[s2]!.length < targetCounts[s2]! && !deductions.isVoid[s2]![card.suit];

      if (canS1 && !canS2) {
        hands[s1]!.push(card);
      } else if (!canS1 && canS2) {
        hands[s2]!.push(card);
      } else if (canS1 && canS2) {
        // Assign to whoever has more empty slots
        const rem1 = targetCounts[s1]! - hands[s1]!.length;
        const rem2 = targetCounts[s2]! - hands[s2]!.length;
        if (rem1 >= rem2) {
          hands[s1]!.push(card);
        } else {
          hands[s2]!.push(card);
        }
      } else {
        unassigned.push(card);
      }
    }

    // Fallback fill for any unassigned due to strict constraints
    for (const s of oppSeats) {
      while (hands[s]!.length < targetCounts[s]! && unassigned.length > 0) {
        hands[s]!.push(unassigned.pop()!);
      }
    }

    // Build SimState
    const currentTrick: SimPlayerCard[] =
      state.currentTrick.length >= 3
        ? []
        : state.currentTrick.map((p) => ({
            seatIndex: p.seatIndex,
            card: p.card,
          }));

    const gameMode = (state.gameMode || 5) as GameMode;
    const trumpSuit = GAME_MODE_INFO[gameMode]?.trumpSuit as Suit | undefined;

    return {
      hands,
      currentTrick,
      turnSeat: state.currentTurnSeat,
      declarerSeat: state.declarerSeat!,
      gameMode,
      trumpSuit,
      declarerCardPoints: state.declarerCardPoints,
      defenderCardPoints: state.defenderCardPoints,
      tricksPlayed: state.trickHistory.length,
      declarerTricksWon: state.trickHistory.filter((t) => t.winnerSeat === state.declarerSeat).length,
      defenderTricksWon: state.trickHistory.filter(
        (t) => t.winnerSeat !== undefined && t.winnerSeat !== state.declarerSeat,
      ).length,
    };
  }

  /**
   * Applies a card play to the simulation state, managing trick progression and scores.
   */
  public static applyMove(sim: SimState, cardId: string): void {
    const seat = sim.turnSeat;
    const hand = sim.hands[seat]!;
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error(`ISMCTS applyMove: Card ${cardId} not found in seat ${seat} hand`);
    }

    const [card] = hand.splice(cardIndex, 1);
    sim.currentTrick.push({ seatIndex: seat, card: card! });

    if (sim.currentTrick.length < 3) {
      sim.turnSeat = (seat + 1) % 3;
    } else {
      // Trick complete: determine winner
      const winnerSeat = GameEngine.determineTrickWinner(sim.currentTrick, sim.gameMode);
      const points =
        sim.currentTrick[0]!.card.points +
        sim.currentTrick[1]!.card.points +
        sim.currentTrick[2]!.card.points;

      if (winnerSeat === sim.declarerSeat) {
        sim.declarerCardPoints += points;
        sim.declarerTricksWon++;
      } else {
        sim.defenderCardPoints += points;
        sim.defenderTricksWon++;
      }

      sim.tricksPlayed++;
      sim.currentTrick = [];
      sim.turnSeat = winnerSeat;
    }
  }

  /**
   * Terminal check for fast simulation pruning.
   */
  public static isTerminal(sim: SimState): boolean {
    const handsEmpty =
      sim.hands[0]!.length === 0 &&
      sim.hands[1]!.length === 0 &&
      sim.hands[2]!.length === 0 &&
      sim.currentTrick.length === 0;
    if (handsEmpty || sim.tricksPlayed >= 10) return true;

    const mode = sim.gameMode;

    // 1. Color games: 66 eye threshold
    if (mode >= 5 && mode <= 8) {
      return sim.declarerCardPoints >= 66 || sim.defenderCardPoints >= 66;
    }

    // 2. Bettl / Doppelbettl: terminates immediately if declarer wins a trick
    if (mode === 9 || mode === 11) {
      return sim.declarerTricksWon > 0;
    }

    // 3. Mord / Doppelmord: terminates immediately if defenders win a trick
    if (mode === 10 || mode === 12) {
      return sim.defenderTricksWon > 0;
    }

    return false;
  }

  /**
   * Fast rollout policy: picks an intelligent move during rollout.
   */
  public static selectRolloutMove(sim: SimState, legalIds: string[]): string {
    if (legalIds.length === 1) return legalIds[0]!;

    const hand = sim.hands[sim.turnSeat]!;
    const cards = hand.filter((c) => legalIds.includes(c.id));

    // Color games: lead trump if declarer, otherwise duck or smear
    if (sim.gameMode >= 5 && sim.gameMode <= 8 && sim.trumpSuit) {
      // Pos 2 (last to play): win cheaply or discard lowest point
      if (sim.currentTrick.length === 2) {
        const canWin = cards.filter((c) => {
          const simTrick = [...sim.currentTrick, { seatIndex: sim.turnSeat, card: c }];
          return GameEngine.determineTrickWinner(simTrick, sim.gameMode) === sim.turnSeat;
        });

        if (canWin.length > 0) {
          // Sort by lowest points/rank among winning cards
          canWin.sort((a, b) => a.points - b.points || a.rank - b.rank);
          return canWin[0]!.id;
        }

        // Cannot win: discard lowest point card
        cards.sort((a, b) => a.points - b.points || a.rank - b.rank);
        return cards[0]!.id;
      }
    }

    // Default fast choice: random legal move
    return legalIds[Math.floor(Math.random() * legalIds.length)]!;
  }

  /**
   * Evaluates terminal payoff from observer's perspective (1.0 = win, 0.0 = loss).
   */
  public static evaluatePayoff(sim: SimState, observerSeat: number): number {
    const isObserverDeclarer = observerSeat === sim.declarerSeat;
    let declarerWon = false;

    if (sim.gameMode >= 5 && sim.gameMode <= 8) {
      if (sim.declarerCardPoints >= 66) {
        declarerWon = true;
      } else if (sim.defenderCardPoints >= 66) {
        declarerWon = false;
      } else {
        declarerWon = sim.declarerCardPoints >= 61;
      }
    } else if (sim.gameMode === 9 || sim.gameMode === 11) {
      declarerWon = sim.declarerTricksWon === 0;
    } else if (sim.gameMode === 10 || sim.gameMode === 12) {
      declarerWon = sim.defenderTricksWon === 0;
    }

    const observerWon = isObserverDeclarer ? declarerWon : !declarerWon;
    return observerWon ? 1.0 : 0.0;
  }
}
