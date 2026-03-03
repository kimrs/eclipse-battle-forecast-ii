import type { Blueprint, DieColor, DieSymbol } from '../types/game';

export function aggregateDieSymbols(symbols: DieSymbol[][]): DieSymbol[] {
  const counts = new Map<DieColor, number>();
  for (const group of symbols) {
    for (const sym of group) {
      counts.set(sym.color, (counts.get(sym.color) ?? 0) + sym.count);
    }
  }
  return Array.from(counts.entries()).map(([color, count]) => ({ color, count }));
}

export function computeBlueprintStats(blueprint: Blueprint): {
  cannons: DieSymbol[];
  missiles: DieSymbol[];
  computers: number;
  shields: number;
  hull: number;
  initiative: number;
  energyBalance: number;
} {
  const { initiativeBonus } = blueprint;
  const parts = blueprint.parts.filter(p => p != null);
  return {
    cannons: aggregateDieSymbols(parts.map(p => p.cannons)),
    missiles: aggregateDieSymbols(parts.map(p => p.missiles)),
    computers: parts.reduce((sum, p) => sum + p.computers, 0) + (blueprint.innateComputers ?? 0),
    shields: parts.reduce((sum, p) => sum + p.shields, 0) + (blueprint.innateShields ?? 0),
    hull: parts.reduce((sum, p) => sum + p.hull, 0) + (blueprint.innateHull ?? 0),
    initiative: initiativeBonus + parts.reduce((sum, p) => sum + p.initiative, 0) + (blueprint.innateInitiative ?? 0),
    energyBalance: parts.reduce((sum, p) => sum + p.energyProduction - p.energyConsumption, 0) + (blueprint.innateEnergyProduction ?? 0),
  };
}
