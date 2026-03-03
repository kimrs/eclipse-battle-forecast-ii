import { describe, it, expect } from 'vitest';
import {
  assignHitsOptimally,
  assignBackfireDamage,
  resolveHits,
} from '../hitAssignment';
import type { HitResult, PendingDieResult } from '../hitAssignment';
import type { BattleShip, Blueprint, DieValue, ShipPart } from '../../types/game';
import { computeBlueprintStats } from '../blueprintStats';
import { PART_BY_ID } from '../../data/constants';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeBlueprint(hull: number, shields: number, hasRiftWeapon = false): Blueprint {
  const parts: ShipPart[] = [];
  if (shields > 0) {
    parts.push({ ...PART_BY_ID['gauss-shield'], shields });
  }
  if (hull > 0) {
    parts.push({ ...PART_BY_ID['hull'], hull });
  }
  if (hasRiftWeapon) {
    parts.push(PART_BY_ID['rift-cannon']);
  }
  return { shipType: 'interceptor', initiativeBonus: 0, slots: 8, parts };
}

function makeShip(
  id: string,
  factionId: string,
  hull: number,
  shields: number,
  hasRiftWeapon = false,
): BattleShip {
  const blueprint = makeBlueprint(hull, shields, hasRiftWeapon);
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
    hasRiftWeapon,
  };
}

function hit(damage: number, isAntimatter = false): HitResult {
  return { damage, isAntimatter, selfDamage: 0, isRift: false };
}

function totalDamageOn(assignments: Array<{ targetShipId: string; damage: number }>, id: string): number {
  return assignments.filter(a => a.targetShipId === id).reduce((s, a) => s + a.damage, 0);
}

// ---------------------------------------------------------------------------
// assignHitsOptimally — hull thresholds
// ---------------------------------------------------------------------------

describe('assignHitsOptimally — hull thresholds', () => {
  it('destroys 2 interceptors (hull 0) with 2 hits of 1 damage each', () => {
    const ships = [
      makeShip('i1', 'def', 0, 0),
      makeShip('i2', 'def', 0, 0),
    ];
    const result = assignHitsOptimally([hit(1), hit(1)], ships, false);

    expect(totalDamageOn(result, 'i1')).toBeGreaterThanOrEqual(1);
    expect(totalDamageOn(result, 'i2')).toBeGreaterThanOrEqual(1);
  });

  it('destroys dreadnought (hull 2) with 3 hits of 1 damage each', () => {
    const ships = [makeShip('d1', 'def', 2, 0)];
    const result = assignHitsOptimally([hit(1), hit(1), hit(1)], ships, false);

    expect(totalDamageOn(result, 'd1')).toBe(3);
    // hull 2 – 3 damage = -1 → destroyed
  });

  it('does not destroy dreadnought (hull 2) with only 2 hits of 1 damage', () => {
    const ships = [makeShip('d1', 'def', 2, 0)];
    const result = assignHitsOptimally([hit(1), hit(1)], ships, false);

    // 2 damage assigned (as "leftover dump"), hull ends at 0 — not destroyed
    expect(totalDamageOn(result, 'd1')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// assignHitsOptimally — optimal kill maximization (player)
// ---------------------------------------------------------------------------

describe('assignHitsOptimally — player optimal strategy', () => {
  it('destroys 2 small ships rather than partially damaging 1 large ship', () => {
    const ships = [
      makeShip('small1', 'def', 0, 0),
      makeShip('small2', 'def', 0, 0),
      makeShip('large1', 'def', 5, 0),
    ];
    // 2 hits of 1 damage: enough to kill both small ships but not the large one
    const result = assignHitsOptimally([hit(1), hit(1)], ships, false);

    expect(totalDamageOn(result, 'small1')).toBeGreaterThanOrEqual(1);
    expect(totalDamageOn(result, 'small2')).toBeGreaterThanOrEqual(1);
    expect(totalDamageOn(result, 'large1')).toBe(0);
  });

  it('dumps leftover hits on largest survivor when all kills used up', () => {
    const ships = [
      makeShip('small1', 'def', 0, 0), // destroyed by first hit
      makeShip('large1', 'def', 5, 0), // gets remaining 2 hits
    ];
    const result = assignHitsOptimally([hit(1), hit(1), hit(1)], ships, false);

    expect(totalDamageOn(result, 'small1')).toBe(1); // destroyed
    expect(totalDamageOn(result, 'large1')).toBe(2); // leftover dumps
  });
});

// ---------------------------------------------------------------------------
// assignHitsOptimally — NPC strategy (largest first)
// ---------------------------------------------------------------------------

describe('assignHitsOptimally — NPC strategy', () => {
  it('destroys largest ship first', () => {
    const ships = [
      makeShip('small1', 'def', 0, 0),
      makeShip('large1', 'def', 2, 0),
    ];
    // 3 hits of 1 damage: enough to kill the large ship (hull 2, needs 3)
    const result = assignHitsOptimally([hit(1), hit(1), hit(1)], ships, true);

    expect(totalDamageOn(result, 'large1')).toBeGreaterThanOrEqual(3);
  });

  it('leaves small ship intact when all damage used on large', () => {
    const ships = [
      makeShip('small1', 'def', 0, 0),
      makeShip('large1', 'def', 2, 0),
    ];
    const result = assignHitsOptimally([hit(1), hit(1), hit(1)], ships, true);

    // Damage assigned: 3 to large (destroys it), 0 to small
    expect(totalDamageOn(result, 'small1')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveHits — Rift Cannon behaviour
// ---------------------------------------------------------------------------

function riftDie(damage: number, selfDamage = 0): PendingDieResult {
  return {
    faceValue: 'star',
    damage,
    selfDamage,
    isAntimatter: false,
    isRift: true,
    attackerComputers: 0,
  };
}

function stdDie(faceValue: DieValue, damage: number, computers: number): PendingDieResult {
  return {
    faceValue,
    damage,
    selfDamage: 0,
    isAntimatter: false,
    isRift: false,
    attackerComputers: computers,
  };
}

describe('resolveHits — Rift Cannon', () => {
  it('Rift hit ignores target shields', () => {
    const enemy = makeShip('e1', 'def', 0, 5); // 5 shields
    const result = resolveHits([riftDie(1)], [enemy], [], false);

    expect(result.enemyDamage).toHaveLength(1);
    expect(result.enemyDamage[0].targetShipId).toBe('e1');
  });

  it('Rift hit ignores attacker computers (auto-hit regardless)', () => {
    const enemy = makeShip('e1', 'def', 0, 0);
    // computers=0, even a numeric 1 would miss normally
    const result = resolveHits([riftDie(1)], [enemy], [], false);

    expect(result.enemyDamage).toHaveLength(1);
  });

  it('Rift blank face does not hit', () => {
    const die: PendingDieResult = {
      faceValue: 'blank',
      damage: 1,
      selfDamage: 0,
      isAntimatter: false,
      isRift: true,
      attackerComputers: 0,
    };
    const enemy = makeShip('e1', 'def', 0, 0);
    const result = resolveHits([die], [enemy], [], false);

    expect(result.enemyDamage).toHaveLength(0);
  });

  it('backfire damage assigned only to Rift-armed ships', () => {
    const riftShip = makeShip('r1', 'att', 2, 0, true);
    const normalShip = makeShip('n1', 'att', 2, 0, false);
    const enemy = makeShip('e1', 'def', 0, 0);

    const result = resolveHits(
      [riftDie(1, 3)], // selfDamage = 3
      [enemy],
      [riftShip, normalShip], // only riftShip is eligible
      false,
    );

    expect(result.backfireDamage.every(a => a.targetShipId === 'r1')).toBe(true);
    expect(result.backfireDamage.every(a => a.targetShipId !== 'n1')).toBe(true);
  });

  it('backfire assigns to largest Rift-armed ship first', () => {
    const smallRift = makeShip('small', 'att', 0, 0, true);
    const largeRift = makeShip('large', 'att', 5, 0, true);
    const enemy = makeShip('e1', 'def', 0, 0);

    // selfDamage=6 destroys largeRift (hull 5, needs 6 damage)
    const result = resolveHits([riftDie(1, 6)], [enemy], [smallRift, largeRift], false);

    const largeDamage = totalDamageOn(result.backfireDamage, 'large');
    expect(largeDamage).toBeGreaterThanOrEqual(6); // destroyed first
  });

  it('backfire can destroy own Rift-armed ship', () => {
    const riftShip = makeShip('r1', 'att', 0, 0, true); // hull 0, destroyed by 1 damage
    const enemy = makeShip('e1', 'def', 0, 0);

    const result = resolveHits([riftDie(1, 1)], [enemy], [riftShip], false);

    const damage = totalDamageOn(result.backfireDamage, 'r1');
    expect(damage).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// resolveHits — mixed Rift + standard dice
// ---------------------------------------------------------------------------

describe('resolveHits — mixed Rift + standard dice', () => {
  it('standard die misses due to shields while Rift die hits', () => {
    const enemy = makeShip('e1', 'def', 1, 3); // 3 shields

    const dieResults: PendingDieResult[] = [
      stdDie(5, 1, 0), // 5 + 0 - 3 = 2 < 6 → miss
      riftDie(1),       // Rift: always hit regardless of shields
    ];

    const result = resolveHits(dieResults, [enemy], [], false);

    // Only the Rift die contributes
    expect(result.enemyDamage).toHaveLength(1);
    expect(result.enemyDamage[0].damage).toBe(1);
  });

  it('standard die hits when computers overcome shields', () => {
    const enemy = makeShip('e1', 'def', 0, 1); // 1 shield

    const dieResult: PendingDieResult[] = [
      stdDie(5, 1, 2), // 5 + 2 - 1 = 6 >= 6 → hit
    ];

    const result = resolveHits(dieResult, [enemy], [], false);

    expect(result.enemyDamage).toHaveLength(1);
  });

  it('standard die misses even high shield value', () => {
    const enemy = makeShip('e1', 'def', 0, 3);

    const dieResult: PendingDieResult[] = [
      stdDie(5, 1, 1), // 5 + 1 - 3 = 3 < 6 → miss
    ];

    const result = resolveHits(dieResult, [enemy], [], false);

    expect(result.enemyDamage).toHaveLength(0);
  });

  it('star face always hits regardless of shields/computers', () => {
    const enemy = makeShip('e1', 'def', 0, 10); // extreme shields

    const dieResult: PendingDieResult[] = [{
      faceValue: 'star',
      damage: 1,
      selfDamage: 0,
      isAntimatter: false,
      isRift: false,
      attackerComputers: 0,
    }];

    const result = resolveHits(dieResult, [enemy], [], false);

    expect(result.enemyDamage).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// assignBackfireDamage
// ---------------------------------------------------------------------------

describe('assignBackfireDamage', () => {
  it('returns empty for 0 backfire', () => {
    const ship = makeShip('r1', 'att', 0, 0, true);
    expect(assignBackfireDamage(0, [ship])).toHaveLength(0);
  });

  it('returns empty for empty ship list', () => {
    expect(assignBackfireDamage(3, [])).toHaveLength(0);
  });

  it('assigns all backfire damage to single ship', () => {
    const ship = makeShip('r1', 'att', 5, 0, true);
    const result = assignBackfireDamage(3, [ship]);

    expect(totalDamageOn(result, 'r1')).toBe(3);
  });

  it('assigns to largest Rift-armed ship first', () => {
    const small = makeShip('small', 'att', 0, 0, true);
    const large = makeShip('large', 'att', 3, 0, true);

    const result = assignBackfireDamage(4, [small, large]); // 4 damage: destroys large (needs 4)

    expect(totalDamageOn(result, 'large')).toBeGreaterThanOrEqual(4);
  });

  it('dumps leftover on largest survivor when not enough to destroy all', () => {
    const ship = makeShip('r1', 'att', 5, 0, true); // needs 6 to destroy
    const result = assignBackfireDamage(3, [ship]);

    // Can't destroy; 3 damage dumped on it
    expect(totalDamageOn(result, 'r1')).toBe(3);
  });

  it('continues to next after destroying one', () => {
    const ship1 = makeShip('r1', 'att', 2, 0, true); // needs 3 to destroy
    const ship2 = makeShip('r2', 'att', 0, 0, true); // needs 1 to destroy

    // 4 damage: 3 to destroy r1, 1 to destroy r2
    const result = assignBackfireDamage(4, [ship1, ship2]);

    expect(totalDamageOn(result, 'r1')).toBeGreaterThanOrEqual(3);
    expect(totalDamageOn(result, 'r2')).toBeGreaterThanOrEqual(1);
  });
});
