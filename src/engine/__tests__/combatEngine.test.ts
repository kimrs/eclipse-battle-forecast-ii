import { describe, it, expect } from 'vitest';
import type { BattleShip, Blueprint, DieFace, DieColor, Faction, ShipType, SectorSetup } from '../../types/game';
import { computeBlueprintStats } from '../blueprintStats';
import type { DiceEngine } from '../diceEngine';
import { resolveBattlePair, simulateSectorBattle, runSimulations } from '../combatEngine';
import { PART_BY_ID } from '../../data/constants';

// ── Test helpers ──────────────────────────────────────────────────────────

function makeBlueprint(overrides: Partial<{
  shipType: ShipType;
  initiativeBonus: number;
  slots: number;
  parts: Blueprint['parts'];
}>): Blueprint {
  return {
    shipType: 'interceptor',
    initiativeBonus: 0,
    slots: 4,
    parts: [],
    ...overrides,
  };
}

const YELLOW_CANNON_PART = PART_BY_ID['ion-cannon'];
const YELLOW_MISSILE_PART = PART_BY_ID['ion-missile'];

function makeBattleShip(id: string, factionId: string, blueprint: Blueprint, hull = 0): BattleShip {
  const fullStats = computeBlueprintStats(blueprint);
  return {
    id,
    factionId,
    blueprint,
    stats: {
      cannons: fullStats.cannons,
      missiles: fullStats.missiles,
      computers: fullStats.computers,
      shields: fullStats.shields,
      hull: fullStats.hull,
      initiative: fullStats.initiative,
    },
    currentHull: hull,
    hasFiredMissiles: false,
    hasRiftWeapon: false,
  };
}

/** Creates a DiceEngine that returns specific faces in sequence per color. Repeats cyclically. */
function makeFixedEngine(plan: Partial<Record<DieColor, DieFace[]>>): DiceEngine {
  const indices = new Map<DieColor, number>();
  return {
    roll(color: DieColor): DieFace {
      const faces = plan[color];
      if (!faces || faces.length === 0) return { value: 'blank', damage: 0 };
      const i = indices.get(color) ?? 0;
      indices.set(color, i + 1);
      return faces[i % faces.length];
    },
    rollMultiple(color: DieColor, count: number): DieFace[] {
      return Array.from({ length: count }, () => this.roll(color));
    },
    reset() {
      indices.clear();
    },
  };
}

const HIT: DieFace = { value: 'star', damage: 1 };
const MISS: DieFace = { value: 'blank', damage: 0 };

// ── resolveBattlePair ──────────────────────────────────────────────────────

describe('resolveBattlePair', () => {
  it('attacker wins simple 1v1 with deterministic hit+miss (attacker higher initiative)', () => {
    // Attacker has higher initiative → fires first → hits → wins
    const aBp = makeBlueprint({ initiativeBonus: 5, parts: [YELLOW_CANNON_PART] });
    const dBp = makeBlueprint({ initiativeBonus: 0, parts: [YELLOW_CANNON_PART] });
    const aShips = [makeBattleShip('a0', 'A', aBp)];
    const dShips = [makeBattleShip('d0', 'D', dBp)];

    // A fires first (higher initiative): HIT kills D; D never fires
    const engine = makeFixedEngine({ yellow: [HIT] });
    const result = resolveBattlePair(
      { factionId: 'A', ships: aShips },
      { factionId: 'D', ships: dShips },
      engine,
      false,
    );
    expect(result.winnerId).toBe('A');
    expect(result.survivors.length).toBe(1);
    expect(result.survivors[0].factionId).toBe('A');
  });

  it('defender wins when initiative is tied (defender fires first on ties)', () => {
    const bp = makeBlueprint({ parts: [YELLOW_CANNON_PART] });
    const aShips = [makeBattleShip('a0', 'A', bp)];
    const dShips = [makeBattleShip('d0', 'D', bp)];

    // Same initiative=0: Defender fires first (D fires HIT, A dies, A never fires)
    const engine = makeFixedEngine({ yellow: [HIT, MISS] });
    const result = resolveBattlePair(
      { factionId: 'A', ships: aShips },
      { factionId: 'D', ships: dShips },
      engine,
      false,
    );
    expect(result.winnerId).toBe('D');
  });

  it('higher-initiative attacker wins 1v1 when hit kills defender before it fires', () => {
    // Attacker with initiative 10 fires first, hits defender → defender dies before firing
    const aBp = makeBlueprint({
      initiativeBonus: 10,
      parts: [YELLOW_CANNON_PART],
    });
    const dBp = makeBlueprint({
      initiativeBonus: 0,
      parts: [YELLOW_CANNON_PART],
    });
    const aShips = [makeBattleShip('a0', 'A', aBp)];
    const dShips = [makeBattleShip('d0', 'D', dBp)];

    const engine = makeFixedEngine({ yellow: [HIT] });
    const result = resolveBattlePair(
      { factionId: 'A', ships: aShips },
      { factionId: 'D', ships: dShips },
      engine,
      false,
    );
    expect(result.winnerId).toBe('A');
  });

  it('stalemate: attacker loses when no cannon dice remain', () => {
    // Ships with only missile parts (no cannons). After missile phase, stalemate.
    const bp = makeBlueprint({ parts: [YELLOW_MISSILE_PART] });
    // After missiles fire (if both miss), no cannons → stalemate → attacker loses
    const aShips = [makeBattleShip('a0', 'A', bp)];
    const dShips = [makeBattleShip('d0', 'D', bp)];

    // Both missiles miss
    const engine = makeFixedEngine({ yellow: [MISS, MISS] });
    const result = resolveBattlePair(
      { factionId: 'A', ships: aShips },
      { factionId: 'D', ships: dShips },
      engine,
      false,
    );
    // No cannons → stalemate → attacker loses
    expect(result.winnerId).toBe('D');
    expect(result.survivors.some(s => s.factionId === 'D')).toBe(true);
  });

  it('missiles fire before engagement: missile kill prevents engagement', () => {
    // Attacker has a missile that kills the defender in missile phase
    // Defender has a cannon (which would fire in engagement if defender survives)
    const aBp = makeBlueprint({ initiativeBonus: 5, parts: [YELLOW_MISSILE_PART] });
    const dBp = makeBlueprint({ initiativeBonus: 0, parts: [YELLOW_CANNON_PART] });
    const aShips = [makeBattleShip('a0', 'A', aBp)];
    const dShips = [makeBattleShip('d0', 'D', dBp)];

    // Missile phase: A fires missile (hit), D fires missile (no missile → skip)
    // Engagement: D is dead, no engagement
    const engine = makeFixedEngine({ yellow: [HIT] }); // A's missile hits
    const result = resolveBattlePair(
      { factionId: 'A', ships: aShips },
      { factionId: 'D', ships: dShips },
      engine,
      false,
    );
    expect(result.winnerId).toBe('A');
    expect(result.rounds).toBe(0); // no engagement rounds
  });

  it('ships with no weapons result in stalemate (attacker loses)', () => {
    const emptyBp = makeBlueprint({ parts: [] });
    const aShips = [makeBattleShip('a0', 'A', emptyBp)];
    const dShips = [makeBattleShip('d0', 'D', emptyBp)];

    const engine = makeFixedEngine({});
    const result = resolveBattlePair(
      { factionId: 'A', ships: aShips },
      { factionId: 'D', ships: dShips },
      engine,
      false,
    );
    expect(result.winnerId).toBe('D'); // attacker loses stalemate
  });
});

// ── simulateSectorBattle ───────────────────────────────────────────────────

describe('simulateSectorBattle', () => {
  const cannonBp = makeBlueprint({ parts: [YELLOW_CANNON_PART] });

  function makeFaction(id: string): Faction {
    return {
      id,
      name: id,
      blueprints: {
        interceptor: cannonBp,
        cruiser: makeBlueprint({ shipType: 'cruiser' }),
        dreadnought: makeBlueprint({ shipType: 'dreadnought' }),
        starbase: makeBlueprint({ shipType: 'starbase' }),
      },
    };
  }

  it('two factions: winner determined correctly', () => {
    const setup: SectorSetup = {
      factions: [
        { id: 'A', factionId: 'A', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 2, controlsSector: false },
        { id: 'D', factionId: 'D', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 1, controlsSector: true },
      ],
      npcs: [],
    };
    const factions = { A: makeFaction('A'), D: makeFaction('D') };
    // D fires first (defender, same initiative), hits A → D wins
    const engine = makeFixedEngine({ yellow: [HIT, MISS] });
    const result = simulateSectorBattle(setup, factions, engine);
    expect(result.winnerId).toBe('D');
    expect(result.survivors.length).toBe(1);
    expect(result.survivors[0].factionId).toBe('D');
  });

  it('multi-faction: pairing order respects turnOfEntry', () => {
    // A (turnOfEntry=3) vs B (turnOfEntry=2) vs C (controlsSector, turnOfEntry=1)
    // Order: A attacks B, winner attacks C
    // A (initiative 10) fires first, hits B (B dies). Battle 1: A wins.
    // Battle 2: A (initiative 10) vs C (initiative 0, defender).
    //   A fires first: HIT → C hull 1→0 (C survives, hull=0).
    //   C fires: HIT → A hull 0→-1 (A dies).
    //   C wins Battle 2.
    const hullOnePart = { ...YELLOW_CANNON_PART, hull: 1 };
    const aBp = makeBlueprint({ initiativeBonus: 10, parts: [YELLOW_CANNON_PART] });
    const bBp = makeBlueprint({ initiativeBonus: 0, parts: [YELLOW_CANNON_PART] });
    const cBp = makeBlueprint({ initiativeBonus: 0, parts: [hullOnePart] }); // hull=1 so survives one hit

    const factions: Record<string, Faction> = {
      A: { id: 'A', name: 'A', blueprints: { interceptor: aBp, cruiser: makeBlueprint({ shipType: 'cruiser' }), dreadnought: makeBlueprint({ shipType: 'dreadnought' }), starbase: makeBlueprint({ shipType: 'starbase' }) } },
      B: { id: 'B', name: 'B', blueprints: { interceptor: bBp, cruiser: makeBlueprint({ shipType: 'cruiser' }), dreadnought: makeBlueprint({ shipType: 'dreadnought' }), starbase: makeBlueprint({ shipType: 'starbase' }) } },
      C: { id: 'C', name: 'C', blueprints: { interceptor: cBp, cruiser: makeBlueprint({ shipType: 'cruiser' }), dreadnought: makeBlueprint({ shipType: 'dreadnought' }), starbase: makeBlueprint({ shipType: 'starbase' }) } },
    };

    const setup: SectorSetup = {
      factions: [
        { id: 'A', factionId: 'A', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 3, controlsSector: false },
        { id: 'B', factionId: 'B', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 2, controlsSector: false },
        { id: 'C', factionId: 'C', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 1, controlsSector: true },
      ],
      npcs: [],
    };

    // All hits: HIT, HIT, HIT, HIT, ...
    const engine = makeFixedEngine({ yellow: [HIT, HIT, HIT, HIT, HIT] });
    const result = simulateSectorBattle(setup, factions, engine);

    expect(result.battleLog.length).toBe(2);
    expect(result.battleLog[0].winnerId).toBe('A');
    expect(result.winnerId).toBe('C');
  });

  it('sector controller is always last player to fight', () => {
    // Even if controller has high turnOfEntry, they should fight last
    const factions: Record<string, Faction> = {
      A: { id: 'A', name: 'A', blueprints: { interceptor: cannonBp, cruiser: makeBlueprint({ shipType: 'cruiser' }), dreadnought: makeBlueprint({ shipType: 'dreadnought' }), starbase: makeBlueprint({ shipType: 'starbase' }) } },
      B: { id: 'B', name: 'B', blueprints: { interceptor: cannonBp, cruiser: makeBlueprint({ shipType: 'cruiser' }), dreadnought: makeBlueprint({ shipType: 'dreadnought' }), starbase: makeBlueprint({ shipType: 'starbase' }) } },
    };
    const setup: SectorSetup = {
      factions: [
        { id: 'A', factionId: 'A', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 1, controlsSector: true },
        { id: 'B', factionId: 'B', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 2, controlsSector: false },
      ],
      npcs: [],
    };
    // B (non-controller, turnOfEntry=2) attacks A (controller)
    // B fires first in their pairing... actually A is defender (controlsSector)
    // A fires first (defender), hits B → A wins
    const engine = makeFixedEngine({ yellow: [HIT, MISS] });
    const result = simulateSectorBattle(setup, factions, engine);
    expect(result.winnerId).toBe('A');
  });
});

// ── runSimulations ────────────────────────────────────────────────────────

describe('runSimulations', () => {
  const cannonBp = makeBlueprint({ parts: [YELLOW_CANNON_PART] });
  function makeFaction(id: string): Faction {
    return {
      id, name: id,
      blueprints: {
        interceptor: cannonBp,
        cruiser: makeBlueprint({ shipType: 'cruiser' }),
        dreadnought: makeBlueprint({ shipType: 'dreadnought' }),
        starbase: makeBlueprint({ shipType: 'starbase' }),
      },
    };
  }

  it('returns correct structure with wins summing to runs', () => {
    const setup: SectorSetup = {
      factions: [
        { id: 'A', factionId: 'A', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 2, controlsSector: false },
        { id: 'B', factionId: 'B', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 1, controlsSector: true },
      ],
      npcs: [],
    };
    const factions = { A: makeFaction('A'), B: makeFaction('B') };
    const config = { runs: 100, dicePool: 600 };

    const results = runSimulations(setup, factions, config);

    expect(results.runs.length).toBe(100);
    expect(results.config).toEqual(config);

    const totalWins = results.summary.reduce((s, f) => s + f.wins, 0);
    // Wins + draws should equal runs
    const draws = results.runs.filter(r => r.winnerId === null).length;
    expect(totalWins + draws).toBe(100);
  });

  it('all summary faction IDs are present', () => {
    const setup: SectorSetup = {
      factions: [
        { id: 'X', factionId: 'X', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 2, controlsSector: false },
        { id: 'Y', factionId: 'Y', ships: [{ type: 'interceptor', count: 1 }], turnOfEntry: 1, controlsSector: true },
      ],
      npcs: [],
    };
    const factions = { X: makeFaction('X'), Y: makeFaction('Y') };
    const results = runSimulations(setup, factions, { runs: 10, dicePool: 600 });
    const ids = results.summary.map(f => f.factionId);
    expect(ids).toContain('X');
    expect(ids).toContain('Y');
  });
});
