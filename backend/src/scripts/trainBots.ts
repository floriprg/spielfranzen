import { BotEvolutionSimulator } from '../game/BotEvolutionSimulator.js';

// Parse arguments from CLI
const args = process.argv.slice(2);
const getArg = (name: string, fallback: number): number => {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) {
    return parseInt(args[idx + 1]!, 10);
  }
  return fallback;
};

const generations = getArg('--generations', 3);
const populationSize = getArg('--population', 6);
const dealsPerPairing = getArg('--deals', 4);

console.log('================================================================');
console.log('🏆 SPIELFRANZEN BOT TRAINING & EVOLUTION TOURNAMENT');
console.log('================================================================');
console.log(`• Generationen:       ${generations}`);
console.log(`• Population:         ${populationSize} Bot-Strategien`);
console.log(`• Duplicate Deals:    ${dealsPerPairing} pro 3er-Paarung (Fairness-Rotation)`);
console.log('----------------------------------------------------------------\n');

const startTime = Date.now();

const finalResult = BotEvolutionSimulator.runEvolution(
  generations,
  populationSize,
  dealsPerPairing,
  (gen, result) => {
    console.log(`\n📊 [GENERATION ${gen}/${generations}] - ${result.totalGamesPlayed} gespielte Runden`);
    console.log('----------------------------------------------------------------------------------------------------------------');
    console.log(
      'Rang | Name                           | Siege | Win-Rate | Solo-Win | Pkt-Delta | Fitness',
    );
    console.log('----------------------------------------------------------------------------------------------------------------');

    result.rankings.forEach((r, idx) => {
      const rankStr = String(idx + 1).padEnd(4);
      const nameStr = r.botName.padEnd(30);
      const winsStr = String(r.wins).padStart(5);
      const winRateStr = `${r.winRate.toFixed(1)}%`.padStart(8);
      const soloRateStr = `${r.soloWinRate.toFixed(1)}%`.padStart(8);
      const deltaStr = (r.pointsDelta > 0 ? `+${r.pointsDelta}` : `${r.pointsDelta}`).padStart(9);
      const fitnessStr = String(r.fitness).padStart(7);

      console.log(`${rankStr} | ${nameStr} | ${winsStr} | ${winRateStr} | ${soloRateStr} | ${deltaStr} | ${fitnessStr}`);
    });
    console.log('----------------------------------------------------------------------------------------------------------------');

    console.log(`⭐ Aktueller Champion: ${result.champion.name || 'Champion'}`);
    console.log(
      `   [Parameter] Trumpf-Zug-Aggression: ${result.champion.trumpLeadTendency}x | Schmieren: ${result.champion.smearAggression}x | Min-Farbspiel-Power: ${result.champion.colorGameMinPower} | Blank-Bonus: ${result.champion.discardBlankSuitBonus}`,
    );
  },
);

const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n================================================================');
console.log(`✅ TRAINING ERFOLGREICH ABGESCHLOSSEN (${elapsedSeconds}s)`);
console.log(`• Gesamtzahl simulierter Runden: ${finalResult.totalGamesPlayed}`);
console.log(`• Gekrönter Champion:            ${finalResult.champion.name}`);
console.log('• Die optimierten Gewichte wurden in championBotWeights.json gespeichert.');
console.log('• Alle Spiel-Bots nutzen ab sofort diese gestärkte KI-Strategie!');
console.log('================================================================\n');
