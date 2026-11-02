import {
  BotStrategyWeights,
  BotTournamentResult,
  Card,
  FullGameState,
  GameMode,
} from '@spielfranzen/shared';
import { BotEngine, DEFAULT_BOT_WEIGHTS } from './BotEngine.js';
import { createShuffledDeck } from './deck.js';
import { GameEngine } from './GameEngine.js';

export interface BotCandidate {
  id: string;
  name: string;
  weights: BotStrategyWeights;
  gamesPlayed: number;
  roundsWon: number;
  pointsDelta: number;
  soloGames: number;
  soloWins: number;
  defenderGames: number;
  defenderWins: number;
  fitness: number;
}

export class BotEvolutionSimulator {
  /**
   * Simulates a single round of Franzen between three bot configurations.
   */
  public static simulateRound(
    botWeights: [BotStrategyWeights, BotStrategyWeights, BotStrategyWeights],
    predefinedDeck?: Card[],
  ): {
    declarerSeat: number;
    gameMode: number;
    declarerWon: boolean;
    deltas: [number, number, number];
  } {
    const players = [
      { userId: 'bot-0', username: 'Bot 0', isBot: true },
      { userId: 'bot-1', username: 'Bot 1', isBot: true },
      { userId: 'bot-2', username: 'Bot 2', isBot: true },
    ];

    const state = GameEngine.createInitialState(
      `sim-${Date.now()}-${Math.random()}`,
      'SIMBOT',
      1,
      players,
    );

    // If predefined deck provided, re-deal using that deck for duplicate fairness
    if (predefinedDeck && predefinedDeck.length === 33) {
      state.hands = [
        predefinedDeck.slice(0, 10),
        predefinedDeck.slice(10, 20),
        predefinedDeck.slice(20, 30),
      ];
      state.talon = predefinedDeck.slice(30, 33);
    }

    // 1. Simulate Bidding Phase
    let biddingSteps = 0;
    while (state.phase === 'BIDDING' && biddingSteps < 50) {
      biddingSteps++;
      const currentSeat = state.currentTurnSeat;
      const decision = BotEngine.decideBidAction(state, currentSeat, botWeights[currentSeat]);
      GameEngine.handleBid(state, currentSeat, decision.action, decision.bidValue);
    }

    // If all passed (redealt), simulate up to 2 additional redeal attempts
    let redeals = 0;
    while (state.phase === 'BIDDING' && redeals < 2) {
      redeals++;
      biddingSteps = 0;
      while (state.phase === 'BIDDING' && biddingSteps < 50) {
        biddingSteps++;
        const currentSeat = state.currentTurnSeat;
        const decision = BotEngine.decideBidAction(state, currentSeat, botWeights[currentSeat]);
        GameEngine.handleBid(state, currentSeat, decision.action, decision.bidValue);
      }
    }

    // If still in bidding (e.g. all passed repeatedly), force Vorhand (seat 0) to open mode 5
    if (state.phase === 'BIDDING') {
      state.declarerSeat = 0;
      state.minMode = 5;
      state.phase = 'TALON_AND_DECLARATION';
    }

    // 2. Simulate Talon & Declaration Phase
    const declarer = state.declarerSeat ?? 0;
    const talonDecision = BotEngine.decideTalonAction(state, declarer, botWeights[declarer]);
    GameEngine.handleTalonAction(
      state,
      declarer,
      talonDecision.action,
      talonDecision.discardedCardIds,
      talonDecision.selectedMode,
    );

    // 3. Simulate Trick Play Phase
    let trickSteps = 0;
    while (state.phase === 'TRICK_PLAY' && trickSteps < 40) {
      trickSteps++;
      const currentSeat = state.currentTurnSeat;
      const cardId = BotEngine.decideCardToPlay(state, currentSeat, botWeights[currentSeat]);
      const res = GameEngine.handlePlayCard(state, currentSeat, cardId);
      if (res.roundEnded) {
        break;
      }
    }

    const result = state.lastRoundResult;
    const decDelta = result?.scoreDeltaDeclarer ?? 0;
    const defDelta = result?.scoreDeltaDefenders ?? 0;
    const declarerWon = result?.declarerWon ?? false;

    const deltas: [number, number, number] = [
      declarer === 0 ? decDelta : defDelta,
      declarer === 1 ? decDelta : defDelta,
      declarer === 2 ? decDelta : defDelta,
    ];

    return {
      declarerSeat: declarer,
      gameMode: state.gameMode || 5,
      declarerWon,
      deltas,
    };
  }

  /**
   * Creates a mutated copy of strategy weights.
   */
  public static mutateWeights(base: BotStrategyWeights, mutationRate = 0.25): BotStrategyWeights {
    const mutated = { ...base };

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
    const jitter = (val: number, amount: number) =>
      Math.random() < mutationRate ? val + (Math.random() * 2 - 1) * amount : val;

    mutated.colorGameMinTrumpCount = Math.round(
      clamp(jitter(base.colorGameMinTrumpCount, 1), 3, 5),
    );
    mutated.colorGameMinPower = Math.round(clamp(jitter(base.colorGameMinPower, 4), 20, 36));
    mutated.bettlMaxDangerousCards = Math.round(
      clamp(jitter(base.bettlMaxDangerousCards, 1), 1, 4),
    );
    mutated.bettlMinLowCards = Math.round(clamp(jitter(base.bettlMinLowCards, 1), 4, 7));
    mutated.mordMinAces = Math.round(clamp(jitter(base.mordMinAces, 1), 1, 3));
    mutated.mordMinMasters = Math.round(clamp(jitter(base.mordMinMasters, 1), 4, 7));

    mutated.trumpLeadTendency = Number(clamp(jitter(base.trumpLeadTendency, 0.3), 0.5, 2.0).toFixed(2));
    mutated.smearAggression = Number(clamp(jitter(base.smearAggression, 0.3), 0.5, 2.0).toFixed(2));
    mutated.discardTrumpRetention = Number(
      clamp(jitter(base.discardTrumpRetention, 0.5), 1.0, 3.5).toFixed(2),
    );
    mutated.discardBlankSuitBonus = Math.round(clamp(jitter(base.discardBlankSuitBonus, 6), 5, 30));
    mutated.secondPlayerTakeLeadAggression = Number(
      clamp(jitter(base.secondPlayerTakeLeadAggression, 0.3), 0.5, 2.0).toFixed(2),
    );

    return mutated;
  }

  /**
   * Combines (crossover) two bot weight sets.
   */
  public static crossover(parentA: BotStrategyWeights, parentB: BotStrategyWeights): BotStrategyWeights {
    const pick = <T>(a: T, b: T): T => (Math.random() < 0.5 ? a : b);

    return {
      name: `Hybrid_${Math.floor(Math.random() * 1000)}`,
      generation: Math.max(parentA.generation || 0, parentB.generation || 0) + 1,
      colorGameMinTrumpCount: pick(parentA.colorGameMinTrumpCount, parentB.colorGameMinTrumpCount),
      colorGameMinPower: pick(parentA.colorGameMinPower, parentB.colorGameMinPower),
      bettlMaxDangerousCards: pick(parentA.bettlMaxDangerousCards, parentB.bettlMaxDangerousCards),
      bettlMinLowCards: pick(parentA.bettlMinLowCards, parentB.bettlMinLowCards),
      mordMinAces: pick(parentA.mordMinAces, parentB.mordMinAces),
      mordMinMasters: pick(parentA.mordMinMasters, parentB.mordMinMasters),
      trumpLeadTendency: pick(parentA.trumpLeadTendency, parentB.trumpLeadTendency),
      smearAggression: pick(parentA.smearAggression, parentB.smearAggression),
      discardTrumpRetention: pick(parentA.discardTrumpRetention, parentB.discardTrumpRetention),
      discardBlankSuitBonus: pick(parentA.discardBlankSuitBonus, parentB.discardBlankSuitBonus),
      secondPlayerTakeLeadAggression: pick(
        parentA.secondPlayerTakeLeadAggression,
        parentB.secondPlayerTakeLeadAggression,
      ),
    };
  }

  /**
   * Initializes a diverse generation-0 population.
   */
  public static initializePopulation(size = 6): BotCandidate[] {
    const currentChampion = BotEngine.getChampionWeights();

    const presets: BotStrategyWeights[] = [
      { ...currentChampion, name: 'Champion (Baseline)', generation: 0 },
      {
        ...currentChampion,
        name: 'Aggressive Trump Hunter',
        generation: 0,
        trumpLeadTendency: 1.6,
        colorGameMinPower: 22,
        smearAggression: 1.4,
        discardBlankSuitBonus: 22,
      },
      {
        ...currentChampion,
        name: 'Iron Defender',
        generation: 0,
        colorGameMinPower: 28,
        colorGameMinTrumpCount: 5,
        smearAggression: 1.5,
        secondPlayerTakeLeadAggression: 1.4,
      },
      {
        ...currentChampion,
        name: 'Solo Opportunist',
        generation: 0,
        bettlMaxDangerousCards: 4,
        mordMinAces: 2,
        mordMinMasters: 5,
        discardTrumpRetention: 2.8,
      },
    ];

    const population: BotCandidate[] = [];

    // Add presets
    for (let i = 0; i < Math.min(size, presets.length); i++) {
      population.push({
        id: `bot-${i}`,
        name: presets[i]!.name || `Bot_${i}`,
        weights: presets[i]!,
        gamesPlayed: 0,
        roundsWon: 0,
        pointsDelta: 0,
        soloGames: 0,
        soloWins: 0,
        defenderGames: 0,
        defenderWins: 0,
        fitness: 0,
      });
    }

    // Fill remaining with mutated variations of the champion
    while (population.length < size) {
      const idx = population.length;
      const mutated = BotEvolutionSimulator.mutateWeights(currentChampion, 0.4);
      mutated.name = `Mutant_${idx}`;
      mutated.generation = 0;
      population.push({
        id: `bot-${idx}`,
        name: mutated.name,
        weights: mutated,
        gamesPlayed: 0,
        roundsWon: 0,
        pointsDelta: 0,
        soloGames: 0,
        soloWins: 0,
        defenderGames: 0,
        defenderWins: 0,
        fitness: 0,
      });
    }

    return population;
  }

  /**
   * Runs an evolutionary tournament over multiple generations.
   */
  public static runEvolution(
    generations = 3,
    populationSize = 6,
    dealsPerPairing = 4,
    onProgress?: (gen: number, result: BotTournamentResult) => void,
  ): BotTournamentResult {
    let population = BotEvolutionSimulator.initializePopulation(populationSize);
    let totalGamesAllTime = 0;
    let latestTournamentResult: BotTournamentResult | null = null;

    for (let gen = 1; gen <= generations; gen++) {
      // Reset stats for new generation tournament
      for (const bot of population) {
        bot.gamesPlayed = 0;
        bot.roundsWon = 0;
        bot.pointsDelta = 0;
        bot.soloGames = 0;
        bot.soloWins = 0;
        bot.defenderGames = 0;
        bot.defenderWins = 0;
        bot.fitness = 0;
      }

      // Play round-robin triplets
      for (let i = 0; i < population.length; i++) {
        for (let j = i + 1; j < population.length; j++) {
          for (let k = j + 1; k < population.length; k++) {
            const botA = population[i]!;
            const botB = population[j]!;
            const botC = population[k]!;

            // Play duplicate deals with 3-way rotation to remove card luck completely
            for (let d = 0; d < dealsPerPairing; d++) {
              const fairDeck = createShuffledDeck();

              // Rotation 1: A at 0, B at 1, C at 2
              const r1 = BotEvolutionSimulator.simulateRound(
                [botA.weights, botB.weights, botC.weights],
                fairDeck,
              );
              BotEvolutionSimulator.applyStats(botA, botB, botC, r1);

              // Rotation 2: C at 0, A at 1, B at 2
              const r2 = BotEvolutionSimulator.simulateRound(
                [botC.weights, botA.weights, botB.weights],
                fairDeck,
              );
              BotEvolutionSimulator.applyStats(botC, botA, botB, r2);

              // Rotation 3: B at 0, C at 1, A at 2
              const r3 = BotEvolutionSimulator.simulateRound(
                [botB.weights, botC.weights, botA.weights],
                fairDeck,
              );
              BotEvolutionSimulator.applyStats(botB, botC, botA, r3);

              totalGamesAllTime += 3;
            }
          }
        }
      }

      // Calculate fitness
      for (const bot of population) {
        const winRate = bot.gamesPlayed > 0 ? (bot.roundsWon / bot.gamesPlayed) * 100 : 0;
        const soloWinRate = bot.soloGames > 0 ? (bot.soloWins / bot.soloGames) * 100 : 50;
        const defWinRate =
          bot.defenderGames > 0 ? (bot.defenderWins / bot.defenderGames) * 100 : 50;

        bot.fitness =
          bot.pointsDelta +
          bot.roundsWon * 50 +
          winRate * 20 +
          soloWinRate * 40 +
          defWinRate * 30;
      }

      // Sort by fitness descending
      population.sort((a, b) => b.fitness - a.fitness);

      const championCandidate = population[0]!;

      // Compare candidate against stored champion in a head-to-head validation match
      const currentChampion = BotEngine.getChampionWeights();
      const validationDeckCount = 15;
      let candidateScore = 0;
      let championScore = 0;

      for (let v = 0; v < validationDeckCount; v++) {
        const deck = createShuffledDeck();
        const r = BotEvolutionSimulator.simulateRound(
          [championCandidate.weights, currentChampion, DEFAULT_BOT_WEIGHTS],
          deck,
        );
        candidateScore += r.deltas[0];
        championScore += r.deltas[1];
      }

      // If candidate beats current champion, crown candidate as new champion!
      if (candidateScore >= championScore) {
        const newChamp = {
          ...championCandidate.weights,
          name: `Champion Gen ${gen} (${championCandidate.name})`,
          generation: gen,
        };
        BotEngine.setChampionWeights(newChamp);
      }

      const tournamentResult: BotTournamentResult = {
        generation: gen,
        totalGamesPlayed: totalGamesAllTime,
        champion: BotEngine.getChampionWeights(),
        rankings: population.map((b) => ({
          botName: b.name,
          wins: b.roundsWon,
          pointsDelta: b.pointsDelta,
          winRate: b.gamesPlayed > 0 ? Number(((b.roundsWon / b.gamesPlayed) * 100).toFixed(1)) : 0,
          soloWinRate: b.soloGames > 0 ? Number(((b.soloWins / b.soloGames) * 100).toFixed(1)) : 0,
          fitness: Math.round(b.fitness),
          weights: b.weights,
        })),
      };

      latestTournamentResult = tournamentResult;
      if (onProgress) {
        onProgress(gen, tournamentResult);
      }

      // Evolve next generation (Elitism + Crossover + Mutation)
      if (gen < generations) {
        const nextPop: BotCandidate[] = [];

        // 1. Elitism: Top 2 bots survive untouched
        nextPop.push({
          ...population[0]!,
          id: `bot-gen${gen}-0`,
          name: `👑 ${population[0]!.name}`,
          weights: { ...population[0]!.weights },
        });
        nextPop.push({
          ...population[1]!,
          id: `bot-gen${gen}-1`,
          name: `🥈 ${population[1]!.name}`,
          weights: { ...population[1]!.weights },
        });

        // 2. Crossover & Mutation to fill population
        while (nextPop.length < populationSize) {
          const parentA = population[Math.floor(Math.random() * Math.min(3, population.length))]!;
          const parentB = population[Math.floor(Math.random() * Math.min(4, population.length))]!;
          const hybrid = BotEvolutionSimulator.crossover(parentA.weights, parentB.weights);
          const mutated = BotEvolutionSimulator.mutateWeights(hybrid, 0.35);
          const idx = nextPop.length;
          mutated.name = `Gen${gen + 1}_V${idx}`;

          nextPop.push({
            id: `bot-gen${gen}-${idx}`,
            name: mutated.name,
            weights: mutated,
            gamesPlayed: 0,
            roundsWon: 0,
            pointsDelta: 0,
            soloGames: 0,
            soloWins: 0,
            defenderGames: 0,
            defenderWins: 0,
            fitness: 0,
          });
        }

        population = nextPop;
      }
    }

    return latestTournamentResult!;
  }

  private static applyStats(
    bot0: BotCandidate,
    bot1: BotCandidate,
    bot2: BotCandidate,
    result: {
      declarerSeat: number;
      gameMode: number;
      declarerWon: boolean;
      deltas: [number, number, number];
    },
  ) {
    const bots = [bot0, bot1, bot2];

    for (let s = 0; s < 3; s++) {
      const bot = bots[s]!;
      const delta = result.deltas[s]!;
      bot.gamesPlayed++;
      bot.pointsDelta += delta;

      if (delta > 0) {
        bot.roundsWon++;
      }

      if (result.declarerSeat === s) {
        bot.soloGames++;
        if (result.declarerWon) {
          bot.soloWins++;
        }
      } else {
        bot.defenderGames++;
        if (!result.declarerWon) {
          bot.defenderWins++;
        }
      }
    }
  }
}
