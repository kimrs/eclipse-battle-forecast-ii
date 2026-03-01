import { simulateSectorBattle } from './combatEngine';
import { createDiceEngine } from './diceEngine';
import type {
  Faction,
  FactionResult,
  SectorSetup,
  ShipType,
  SimulationConfig,
  SimulationRunResult,
} from '../types/game';

interface WorkerMessage {
  setup: SectorSetup;
  factions: Record<string, Faction>;
  config: SimulationConfig;
}

const MAX_LOG_RUNS = 100;
const PROGRESS_INTERVAL = 50;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { setup, factions, config } = e.data;
  const diceEngine = createDiceEngine(config.dicePool);

  const allFactionIds = [
    ...setup.factions.map(f => f.factionId),
    ...setup.npcs.map((npc, i) => `npc-${npc.type}-${i}`),
  ];

  const winCounts = new Map<string, number>(allFactionIds.map(id => [id, 0]));
  const survivorSums = new Map<string, Map<ShipType, number>>(
    allFactionIds.map(id => [id, new Map()]),
  );

  // Only keep first MAX_LOG_RUNS for the detailed simulation log
  const runs: SimulationRunResult[] = [];

  for (let i = 0; i < config.runs; i++) {
    const detailed = i < MAX_LOG_RUNS;
    const result = simulateSectorBattle(setup, factions, diceEngine, detailed);

    if (i < MAX_LOG_RUNS) {
      runs.push({
        winnerId: result.winnerId,
        survivors: result.survivors,
        events: result.events,
      });
    }

    if (result.winnerId !== null) {
      winCounts.set(result.winnerId, (winCounts.get(result.winnerId) ?? 0) + 1);
    }

    for (const { factionId, ships } of result.survivors) {
      const sums = survivorSums.get(factionId);
      if (!sums) continue;
      for (const { type, count } of ships) {
        sums.set(type, (sums.get(type) ?? 0) + count);
      }
    }

    if (i % PROGRESS_INTERVAL === 0) {
      self.postMessage({ type: 'progress', completed: i + 1, total: config.runs });
    }
  }

  const summary: FactionResult[] = allFactionIds.map(id => {
    const sums = survivorSums.get(id) ?? new Map<ShipType, number>();
    return {
      factionId: id,
      wins: winCounts.get(id) ?? 0,
      avgSurvivors: {
        interceptor: (sums.get('interceptor') ?? 0) / config.runs,
        cruiser: (sums.get('cruiser') ?? 0) / config.runs,
        dreadnought: (sums.get('dreadnought') ?? 0) / config.runs,
        starbase: (sums.get('starbase') ?? 0) / config.runs,
      },
      avgDamageDealt: 0,
    };
  });

  self.postMessage({
    type: 'complete',
    results: { config, runs, summary },
  });
};
