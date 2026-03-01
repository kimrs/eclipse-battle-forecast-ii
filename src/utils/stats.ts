import type { FactionResult, ShipType, SimulationResults, SimulationRunResult } from '../types/game';

export function countWins(runs: SimulationRunResult[], factionId: string): number {
  return runs.filter(r => r.winnerId === factionId).length;
}

export function countDraws(runs: SimulationRunResult[]): number {
  return runs.filter(r => r.winnerId === null).length;
}

export function avgSurvivors(
  runs: SimulationRunResult[],
  factionId: string,
): Record<ShipType, number> {
  const shipTypes: ShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];
  const sums: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
  };
  const total = runs.length;
  if (total === 0) return sums;

  for (const run of runs) {
    const faction = run.survivors.find(s => s.factionId === factionId);
    if (!faction) continue;
    for (const { type, count } of faction.ships) {
      sums[type] += count;
    }
  }

  return Object.fromEntries(
    shipTypes.map(t => [t, sums[t] / total]),
  ) as Record<ShipType, number>;
}

export function aggregateStats(
  results: SimulationResults,
  allFactionIds: string[],
): FactionResult[] {
  const { runs } = results;

  return allFactionIds.map(factionId => ({
    factionId,
    wins: countWins(runs, factionId),
    avgSurvivors: avgSurvivors(runs, factionId),
    avgDamageDealt: 0,
  }));
}

export function winRate(wins: number, total: number): number {
  return total === 0 ? 0 : wins / total;
}
