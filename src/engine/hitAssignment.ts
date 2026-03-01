import type { BattleShip, DieValue } from '../types/game';
import { computeBlueprintStats } from '../types/game';

export interface HitResult {
  damage: number;
  isAntimatter: boolean;
  selfDamage: number;    // Rift backfire damage (0 for non-Rift dice)
  isRift: boolean;       // true for Rift Cannon dice
}

export interface DamageAssignment {
  targetShipId: string;
  damage: number;
}

export interface BackfireAssignment {
  targetShipId: string;  // own ship receiving backfire
  damage: number;
}

export interface PendingDieResult {
  faceValue: DieValue;
  damage: number;
  selfDamage: number;       // Rift backfire (0 for non-Rift)
  isAntimatter: boolean;
  isRift: boolean;           // Rift dice bypass computers/shields
  attackerComputers: number; // ignored for Rift dice
}

export interface ResolvedHits {
  enemyDamage: DamageAssignment[];
  backfireDamage: BackfireAssignment[];
}

function isHitAgainstTarget(
  faceValue: DieValue,
  attackerComputers: number,
  targetShields: number,
): boolean {
  if (faceValue === 'star') return true;
  if (faceValue === 'blank') return false;
  return (faceValue as number) + attackerComputers - targetShields >= 6;
}

/**
 * Assign pre-determined hits optimally across enemy ships.
 * All hits passed in are assumed valid against all enemies (shield check already performed).
 * Player strategy: destroy smallest ships first (maximize kills).
 * NPC strategy: destroy largest ships first.
 */
export function assignHitsOptimally(
  hits: HitResult[],
  enemies: BattleShip[],
  isNpc: boolean,
): DamageAssignment[] {
  if (hits.length === 0 || enemies.length === 0) return [];

  const assignments: DamageAssignment[] = [];
  const hull = new Map<string, number>(enemies.map(e => [e.id, e.currentHull]));

  // Antimatter damage is fungible — pool it together
  let antimatterPool = 0;
  const regular: Array<HitResult & { used: boolean }> = [];
  for (const h of hits) {
    if (h.isAntimatter) {
      antimatterPool += h.damage;
    } else {
      regular.push({ ...h, used: false });
    }
  }

  // Sort enemies: smallest hull first (player) or largest first (NPC)
  const sortedEnemies = [...enemies].sort((a, b) => {
    const ha = hull.get(a.id)!;
    const hb = hull.get(b.id)!;
    return isNpc ? hb - ha : ha - hb;
  });

  for (const enemy of sortedEnemies) {
    const currentHull = hull.get(enemy.id)!;
    const needed = currentHull + 1; // damage needed to destroy

    const available = regular.filter(h => !h.used).sort((a, b) => b.damage - a.damage);
    const totalRegular = available.reduce((s, h) => s + h.damage, 0);

    if (totalRegular + antimatterPool < needed) {
      // Can't destroy this target — skip and try next
      continue;
    }

    // Greedily assign minimum hits to destroy this enemy
    let accumulated = 0;
    const toAssign: Array<HitResult & { used: boolean }> = [];
    for (const h of available) {
      if (accumulated >= needed) break;
      toAssign.push(h);
      accumulated += h.damage;
    }

    let antimatterUsed = 0;
    if (accumulated < needed) {
      antimatterUsed = needed - accumulated;
    }

    for (const h of toAssign) {
      h.used = true;
      assignments.push({ targetShipId: enemy.id, damage: h.damage });
    }
    if (antimatterUsed > 0) {
      antimatterPool -= antimatterUsed;
      assignments.push({ targetShipId: enemy.id, damage: antimatterUsed });
    }
    hull.set(enemy.id, -1); // destroyed
  }

  // Dump remaining hits on largest surviving enemy (chip away hull)
  const alive = enemies.filter(e => hull.get(e.id)! >= 0);
  if (alive.length > 0) {
    const largest = alive.reduce((max, e) =>
      hull.get(e.id)! > hull.get(max.id)! ? e : max,
    );
    for (const h of regular.filter(h => !h.used)) {
      assignments.push({ targetShipId: largest.id, damage: h.damage });
      h.used = true;
    }
    if (antimatterPool > 0) {
      assignments.push({ targetShipId: largest.id, damage: antimatterPool });
    }
  }

  return assignments;
}

/**
 * Assign Rift backfire damage to own Rift-armed ships.
 * Tries to destroy largest Rift-armed ships first.
 * If no ship can be destroyed, dumps remaining on largest.
 */
export function assignBackfireDamage(
  totalBackfire: number,
  ownShips: BattleShip[],
): BackfireAssignment[] {
  if (totalBackfire === 0 || ownShips.length === 0) return [];

  const assignments: BackfireAssignment[] = [];
  const hull = new Map<string, number>(ownShips.map(s => [s.id, s.currentHull]));

  // Sort largest to smallest
  const sorted = [...ownShips].sort((a, b) => hull.get(b.id)! - hull.get(a.id)!);

  let remaining = totalBackfire;

  // Try to destroy ships (largest first)
  for (const ship of sorted) {
    if (remaining <= 0) break;
    const needed = hull.get(ship.id)! + 1;
    if (remaining >= needed) {
      assignments.push({ targetShipId: ship.id, damage: needed });
      remaining -= needed;
      hull.set(ship.id, -1);
    }
  }

  // Dump leftover damage on largest surviving Rift-armed ship
  if (remaining > 0) {
    const alive = ownShips.filter(s => hull.get(s.id)! >= 0);
    if (alive.length > 0) {
      const largest = alive.reduce((max, s) =>
        hull.get(s.id)! > hull.get(max.id)! ? s : max,
      );
      assignments.push({ targetShipId: largest.id, damage: remaining });
    }
  }

  return assignments;
}

/**
 * Resolve raw die results against enemies, handling per-target shield checks and Rift bypass.
 * Calls assignHitsOptimally internally for the assignment step.
 */
export function resolveHits(
  dieResults: PendingDieResult[],
  enemies: BattleShip[],
  ownRiftShips: BattleShip[],
  isNpc: boolean,
): ResolvedHits {
  let totalSelfDamage = 0;

  if (enemies.length === 0) {
    for (const die of dieResults) {
      if (die.isRift && die.faceValue !== 'blank') {
        totalSelfDamage += die.selfDamage;
      }
    }
    return {
      enemyDamage: [],
      backfireDamage: assignBackfireDamage(totalSelfDamage, ownRiftShips),
    };
  }

  // Compute shields per enemy from their blueprint
  const enemyShields = new Map<string, number>(
    enemies.map(e => [e.id, computeBlueprintStats(e.blueprint).shields]),
  );

  // Each processable die tracks which enemies it can hit
  interface ProcessedDie {
    damage: number;
    isAntimatter: boolean;
    isRift: boolean;
    eligibleIds: Set<string>;
    used: boolean;
  }

  const processed: ProcessedDie[] = [];

  for (const die of dieResults) {
    if (die.faceValue === 'blank') continue;

    if (die.isRift) {
      // Rift: only star faces are hits; they bypass all shields
      if (die.faceValue === 'star') {
        processed.push({
          damage: die.damage,
          isAntimatter: die.isAntimatter,
          isRift: true,
          eligibleIds: new Set(enemies.map(e => e.id)),
          used: false,
        });
        totalSelfDamage += die.selfDamage;
      }
    } else {
      // Standard die: determine per-target eligibility
      const eligibleIds = new Set<string>();
      for (const enemy of enemies) {
        const shields = enemyShields.get(enemy.id)!;
        if (isHitAgainstTarget(die.faceValue, die.attackerComputers, shields)) {
          eligibleIds.add(enemy.id);
        }
      }
      if (eligibleIds.size > 0) {
        processed.push({
          damage: die.damage,
          isAntimatter: die.isAntimatter,
          isRift: false,
          eligibleIds,
          used: false,
        });
      }
    }
  }

  // Run greedy assignment with per-target eligibility
  const assignments: DamageAssignment[] = [];
  const hull = new Map<string, number>(enemies.map(e => [e.id, e.currentHull]));

  // Pool antimatter damage
  let antimatterPool = 0;
  const regularDice = processed.filter(d => !d.isAntimatter);
  for (const d of processed.filter(d => d.isAntimatter)) {
    antimatterPool += d.damage;
    d.used = true;
  }

  // Sort enemies for assignment
  const sortedEnemies = [...enemies].sort((a, b) => {
    const ha = hull.get(a.id)!;
    const hb = hull.get(b.id)!;
    return isNpc ? hb - ha : ha - hb;
  });

  for (const enemy of sortedEnemies) {
    const currentHull = hull.get(enemy.id)!;
    const needed = currentHull + 1;

    // Available dice that can hit this enemy
    const eligible = regularDice
      .filter(d => !d.used && d.eligibleIds.has(enemy.id))
      .sort((a, b) => b.damage - a.damage);

    const totalEligible = eligible.reduce((s, d) => s + d.damage, 0);

    if (totalEligible + antimatterPool < needed) {
      continue; // Can't destroy this enemy
    }

    let accumulated = 0;
    const toAssign: ProcessedDie[] = [];
    for (const d of eligible) {
      if (accumulated >= needed) break;
      toAssign.push(d);
      accumulated += d.damage;
    }

    let antimatterUsed = 0;
    if (accumulated < needed) {
      antimatterUsed = needed - accumulated;
    }

    for (const d of toAssign) {
      d.used = true;
      assignments.push({ targetShipId: enemy.id, damage: d.damage });
    }
    if (antimatterUsed > 0) {
      antimatterPool -= antimatterUsed;
      assignments.push({ targetShipId: enemy.id, damage: antimatterUsed });
    }
    hull.set(enemy.id, -1);
  }

  // Dump remaining hits on surviving enemies
  const alive = enemies.filter(e => hull.get(e.id)! >= 0);
  if (alive.length > 0) {
    // Find largest surviving enemy
    const largest = alive.reduce((max, e) =>
      hull.get(e.id)! > hull.get(max.id)! ? e : max,
    );

    for (const d of regularDice.filter(d => !d.used)) {
      // Dump on largest if eligible, otherwise find any eligible survivor
      if (d.eligibleIds.has(largest.id)) {
        assignments.push({ targetShipId: largest.id, damage: d.damage });
        d.used = true;
      } else {
        for (const enemy of alive) {
          if (d.eligibleIds.has(enemy.id)) {
            assignments.push({ targetShipId: enemy.id, damage: d.damage });
            d.used = true;
            break;
          }
        }
      }
    }

    if (antimatterPool > 0) {
      assignments.push({ targetShipId: largest.id, damage: antimatterPool });
    }
  }

  return {
    enemyDamage: assignments,
    backfireDamage: assignBackfireDamage(totalSelfDamage, ownRiftShips),
  };
}
