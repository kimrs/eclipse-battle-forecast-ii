import type {
  FactionResult,
  SectorSetup,
  ShipType,
} from '../types/game';

interface RunResult {
  winnerId: string | null;
  survivors: { factionId: string; ships: { type: ShipType; count: number }[] }[];
}

export interface SimulationAggregator {
  addResult(result: RunResult): void;
  buildSummary(): FactionResult[];
}

export function createSimulationAggregator(
  setup: SectorSetup,
  totalRuns: number,
): SimulationAggregator {
  const allFactionIds = [
    ...setup.factions.map(f => f.id),
    ...setup.npcs.map((npc, i) => `npc-${npc.type}-${i}`),
  ];

  const winCounts = new Map<string, number>(allFactionIds.map(id => [id, 0]));
  const survivorSums = new Map<string, Map<ShipType, number>>(
    allFactionIds.map(id => [id, new Map()]),
  );

  return {
    addResult(result: RunResult) {
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
    },

    buildSummary() {
      return allFactionIds.map(id => {
        const sums = survivorSums.get(id) ?? new Map<ShipType, number>();
        return {
          factionId: id,
          wins: winCounts.get(id) ?? 0,
          avgSurvivors: {
            interceptor: (sums.get('interceptor') ?? 0) / totalRuns,
            cruiser: (sums.get('cruiser') ?? 0) / totalRuns,
            dreadnought: (sums.get('dreadnought') ?? 0) / totalRuns,
            starbase: (sums.get('starbase') ?? 0) / totalRuns,
          },

        };
      });
    },
  };
}
