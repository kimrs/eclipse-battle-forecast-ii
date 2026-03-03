import { describe, it, expect } from 'vitest';
import type { Faction, SectorSetup, ShipType } from '../../types/game';
import { runSimulations } from '../combatEngine';
import { SHIP_PARTS } from '../../data/shipParts';
import { NPC_BLUEPRINTS } from '../../data/npcBlueprints';

// ── Helpers ────────────────────────────────────────────────────────────────

function getPart(id: string) {
  const part = SHIP_PARTS.find(p => p.id === id);
  if (!part) throw new Error(`Part not found: ${id}`);
  return part;
}

function makeFaction(id: string, name: string, interceptorPartIds: string[], cruiserPartIds: string[] = []): Faction {
  return {
    id,
    name,
    blueprints: {
      interceptor: {
        shipType: 'interceptor',
        initiativeBonus: 2,
        slots: 4,
        parts: interceptorPartIds.map(getPart),
      },
      cruiser: {
        shipType: 'cruiser',
        initiativeBonus: 1,
        slots: 6,
        parts: cruiserPartIds.map(getPart),
      },
      dreadnought: {
        shipType: 'dreadnought',
        initiativeBonus: 0,
        slots: 8,
        parts: [],
      },
      starbase: {
        shipType: 'starbase',
        initiativeBonus: 4,
        slots: 5,
        parts: [],
      },
    },
  };
}

const SIMULATION_CONFIG = { runs: 1000, dicePool: 600 };

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Integration: 2-player interceptor battle', () => {
  it('win rates sum to ~100%, no crashes, plausible survivors', () => {
    // Terran-style interceptors: nuclear-source, nuclear-drive, ion-cannon
    const factionA = makeFaction('faction-a', 'Johanna', ['nuclear-source', 'nuclear-drive', 'ion-cannon']);
    // Opponent interceptors with electron-computer (better aim)
    const factionB = makeFaction('faction-b', 'Vernor', ['nuclear-source', 'nuclear-drive', 'electron-computer', 'ion-cannon']);

    const setup: SectorSetup = {
      factions: [
        { id: 'faction-a', factionId: 'faction-a', ships: [{ type: 'interceptor' as ShipType, count: 3 }], turnOfEntry: 1, controlsSector: false },
        { id: 'faction-b', factionId: 'faction-b', ships: [{ type: 'interceptor' as ShipType, count: 3 }], turnOfEntry: 2, controlsSector: true },
      ],
      npcs: [],
    };

    const factions: Record<string, Faction> = {
      'faction-a': factionA,
      'faction-b': factionB,
    };

    const results = runSimulations(setup, factions, SIMULATION_CONFIG);

    expect(results.runs.length).toBe(1000);
    expect(results.summary.length).toBeGreaterThanOrEqual(2);

    const wins = Object.fromEntries(results.summary.map(s => [s.factionId, s.wins]));
    const draws = results.runs.filter(r => r.winnerId === null).length;
    const totalAccountedFor = (wins['faction-a'] ?? 0) + (wins['faction-b'] ?? 0) + draws;

    // Win rates + draw must sum to total runs
    expect(totalAccountedFor).toBe(1000);

    // At least one faction must win some battles (not 0 wins each)
    expect((wins['faction-a'] ?? 0) + (wins['faction-b'] ?? 0)).toBeGreaterThan(0);

    // Win rates should each be in a plausible range (not 100% either way)
    const winPctA = ((wins['faction-a'] ?? 0) / 1000) * 100;
    const winPctB = ((wins['faction-b'] ?? 0) / 1000) * 100;
    expect(winPctA).toBeGreaterThan(0);
    expect(winPctB).toBeGreaterThan(0);
    // With 3v3 interceptors and one side having computer +1, advantage should be noticeable
    expect(winPctB).toBeGreaterThan(winPctA); // Vernor has better computers
  });
});

describe('Integration: cruiser vs cruiser', () => {
  it('runs without errors and produces plausible results', () => {
    const factionA = makeFaction(
      'faction-a', 'Alpha',
      [],
      ['nuclear-source', 'electron-computer', 'ion-cannon', 'hull'],
    );
    const factionB = makeFaction(
      'faction-b', 'Beta',
      [],
      ['nuclear-source', 'electron-computer', 'plasma-cannon', 'hull'],
    );

    const setup: SectorSetup = {
      factions: [
        { id: 'faction-a', factionId: 'faction-a', ships: [{ type: 'cruiser' as ShipType, count: 2 }], turnOfEntry: 1, controlsSector: false },
        { id: 'faction-b', factionId: 'faction-b', ships: [{ type: 'cruiser' as ShipType, count: 2 }], turnOfEntry: 2, controlsSector: true },
      ],
      npcs: [],
    };

    const factions: Record<string, Faction> = { 'faction-a': factionA, 'faction-b': factionB };
    const results = runSimulations(setup, factions, SIMULATION_CONFIG);

    expect(results.runs.length).toBe(1000);
    const draws = results.runs.filter(r => r.winnerId === null).length;
    const winsA = results.summary.find(s => s.factionId === 'faction-a')?.wins ?? 0;
    const winsB = results.summary.find(s => s.factionId === 'faction-b')?.wins ?? 0;
    expect(winsA + winsB + draws).toBe(1000);
  });
});

describe('Integration: player vs Ancient NPC', () => {
  it('runs without errors and produces plausible win rates', () => {
    const playerFaction = makeFaction(
      'player', 'Player',
      ['nuclear-source', 'nuclear-drive', 'electron-computer', 'ion-cannon'],
    );

    const ancientBlueprint = NPC_BLUEPRINTS.ancient.normal;

    const setup: SectorSetup = {
      factions: [
        { id: 'player', factionId: 'player', ships: [{ type: 'interceptor' as ShipType, count: 3 }], turnOfEntry: 1, controlsSector: false },
      ],
      npcs: [
        { id: 'npc-ancient-0', type: 'ancient', blueprint: ancientBlueprint, count: 1, turnOfEntry: 2 },
      ],
    };

    const factions: Record<string, Faction> = { player: playerFaction };
    const results = runSimulations(setup, factions, SIMULATION_CONFIG);

    expect(results.runs.length).toBe(1000);

    const draws = results.runs.filter(r => r.winnerId === null).length;
    const playerWins = results.summary.find(s => s.factionId === 'player')?.wins ?? 0;
    const npcWins = results.runs.filter(r => r.winnerId !== null && r.winnerId !== 'player').length;

    expect(playerWins + npcWins + draws).toBe(1000);
    // Player with 3 interceptors + computer should win some battles
    expect(playerWins).toBeGreaterThan(0);
    // Ancient should also win some battles
    expect(npcWins).toBeGreaterThan(0);
  });
});

describe('Integration: player vs GCDS', () => {
  it('runs without errors; GCDS with 7 hull typically wins against few ships', () => {
    const playerFaction = makeFaction(
      'player', 'Player',
      ['nuclear-source', 'nuclear-drive', 'electron-computer', 'ion-cannon'],
    );

    const gcdsBlueprint = NPC_BLUEPRINTS.gcds.normal;

    const setup: SectorSetup = {
      factions: [
        { id: 'player', factionId: 'player', ships: [{ type: 'interceptor' as ShipType, count: 2 }], turnOfEntry: 1, controlsSector: false },
      ],
      npcs: [
        { id: 'npc-gcds-0', type: 'gcds', blueprint: gcdsBlueprint, count: 1, turnOfEntry: 2 },
      ],
    };

    const factions: Record<string, Faction> = { player: playerFaction };
    const results = runSimulations(setup, factions, SIMULATION_CONFIG);

    expect(results.runs.length).toBe(1000);

    // With 2 interceptors vs GCDS (7 hull + multiple weapons), GCDS should dominate
    const playerWins = results.summary.find(s => s.factionId === 'player')?.wins ?? 0;
    const gcdsWins = results.runs.filter(r => r.winnerId !== null && r.winnerId !== 'player').length;
    expect(gcdsWins).toBeGreaterThan(playerWins);
  });
});

describe('Integration: 3-way battle', () => {
  it('resolves without errors and accounts for all runs', () => {
    const factionA = makeFaction('faction-a', 'Alpha', ['nuclear-source', 'nuclear-drive', 'ion-cannon']);
    const factionB = makeFaction('faction-b', 'Beta', ['nuclear-source', 'nuclear-drive', 'ion-cannon']);
    const factionC = makeFaction('faction-c', 'Gamma', ['nuclear-source', 'nuclear-drive', 'electron-computer', 'ion-cannon']);

    const setup: SectorSetup = {
      factions: [
        { id: 'faction-a', factionId: 'faction-a', ships: [{ type: 'interceptor' as ShipType, count: 2 }], turnOfEntry: 1, controlsSector: true },
        { id: 'faction-b', factionId: 'faction-b', ships: [{ type: 'interceptor' as ShipType, count: 2 }], turnOfEntry: 2, controlsSector: false },
        { id: 'faction-c', factionId: 'faction-c', ships: [{ type: 'interceptor' as ShipType, count: 2 }], turnOfEntry: 3, controlsSector: false },
      ],
      npcs: [],
    };

    const factions: Record<string, Faction> = {
      'faction-a': factionA,
      'faction-b': factionB,
      'faction-c': factionC,
    };

    const results = runSimulations(setup, factions, { runs: 500, dicePool: 600 });

    expect(results.runs.length).toBe(500);

    // All outcomes accounted for
    const allWinnerIds = new Set(results.runs.map(r => r.winnerId));
    const totalWins = results.summary.reduce((s, f) => s + f.wins, 0);
    const draws = results.runs.filter(r => r.winnerId === null).length;
    expect(totalWins + draws).toBe(500);

    // No crashes — all summaries have valid structure
    for (const entry of results.summary) {
      expect(entry.factionId).toBeTruthy();
      expect(typeof entry.wins).toBe('number');
      expect(entry.wins).toBeGreaterThanOrEqual(0);
    }

    // In a 3-way battle, we expect at least 2 different winner ids to appear over 500 runs
    // (including null for draws). This verifies combat resolves, not just trivial outcomes.
    expect(allWinnerIds.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Integration: survivor counts are sensible', () => {
  it('avg survivors per ship type are non-negative and do not exceed max deployed', () => {
    const factionA = makeFaction('faction-a', 'Alpha', ['nuclear-source', 'nuclear-drive', 'electron-computer', 'ion-cannon']);
    const factionB = makeFaction('faction-b', 'Beta', ['nuclear-source', 'nuclear-drive', 'ion-cannon']);

    const MAX_INTERCEPTORS = 4;

    const setup: SectorSetup = {
      factions: [
        { id: 'faction-a', factionId: 'faction-a', ships: [{ type: 'interceptor' as ShipType, count: MAX_INTERCEPTORS }], turnOfEntry: 1, controlsSector: false },
        { id: 'faction-b', factionId: 'faction-b', ships: [{ type: 'interceptor' as ShipType, count: MAX_INTERCEPTORS }], turnOfEntry: 2, controlsSector: true },
      ],
      npcs: [],
    };

    const factions: Record<string, Faction> = {
      'faction-a': factionA,
      'faction-b': factionB,
    };

    const results = runSimulations(setup, factions, { runs: 200, dicePool: 600 });

    for (const entry of results.summary) {
      expect(entry.avgSurvivors.interceptor).toBeGreaterThanOrEqual(0);
      expect(entry.avgSurvivors.interceptor).toBeLessThanOrEqual(MAX_INTERCEPTORS);
    }
  });
});
