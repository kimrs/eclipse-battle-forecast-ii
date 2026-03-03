import { simulateSectorBattle } from './combatEngine';
import { createDiceEngine } from './diceEngine';
import { createSimulationAggregator } from './simulationAggregator';
import type {
  Faction,
  SectorSetup,
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
  const aggregator = createSimulationAggregator(setup, config.runs);
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

    aggregator.addResult(result);

    if (i % PROGRESS_INTERVAL === 0) {
      self.postMessage({ type: 'progress', completed: i + 1, total: config.runs });
    }
  }

  self.postMessage({
    type: 'complete',
    results: { config, runs, summary: aggregator.buildSummary() },
  });
};
