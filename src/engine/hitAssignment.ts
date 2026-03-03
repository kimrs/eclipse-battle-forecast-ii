import type { BattleShip, DieValue } from '../types/game';

export interface HitResult {
  damage: number;
  isAntimatter: boolean;
  selfDamage: number;    // Rift backfire damage (0 for non-Rift dice)
  isRift: boolean;       // true for Rift Cannon dice
  eligibleTargetIds?: Set<string>;  // when present, only these targets can receive this hit
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
 * Assign hits optimally across enemy ships.
 * Hits with eligibleTargetIds are only assigned to those targets; others hit any enemy.
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

    const available = regular
      .filter(h => !h.used && (!h.eligibleTargetIds || h.eligibleTargetIds.has(enemy.id)))
      .sort((a, b) => b.damage - a.damage);
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
      if (!h.eligibleTargetIds || h.eligibleTargetIds.has(largest.id)) {
        assignments.push({ targetShipId: largest.id, damage: h.damage });
      } else {
        // Find any eligible survivor
        for (const enemy of alive) {
          if (h.eligibleTargetIds.has(enemy.id)) {
            assignments.push({ targetShipId: enemy.id, damage: h.damage });
            break;
          }
        }
      }
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

  // Use pre-computed shields from BattleShip stats
  const enemyShields = new Map<string, number>(
    enemies.map(e => [e.id, e.stats.shields]),
  );

  // Build HitResult[] with per-target eligibility for assignHitsOptimally
  const hits: HitResult[] = [];

  for (const die of dieResults) {
    if (die.faceValue === 'blank') continue;

    if (die.isRift) {
      // Rift: only star faces are hits; they bypass all shields
      if (die.faceValue === 'star') {
        hits.push({
          damage: die.damage,
          isAntimatter: die.isAntimatter,
          selfDamage: die.selfDamage,
          isRift: true,
          // No eligibleTargetIds — Rift hits bypass shields, eligible against all
        });
        totalSelfDamage += die.selfDamage;
      }
    } else {
      // Standard die: determine per-target eligibility based on shields
      const eligibleTargetIds = new Set<string>();
      for (const enemy of enemies) {
        const shields = enemyShields.get(enemy.id)!;
        if (isHitAgainstTarget(die.faceValue, die.attackerComputers, shields)) {
          eligibleTargetIds.add(enemy.id);
        }
      }
      if (eligibleTargetIds.size > 0) {
        hits.push({
          damage: die.damage,
          isAntimatter: die.isAntimatter,
          selfDamage: 0,
          isRift: false,
          eligibleTargetIds,
        });
      }
    }
  }

  return {
    enemyDamage: assignHitsOptimally(hits, enemies, isNpc),
    backfireDamage: assignBackfireDamage(totalSelfDamage, ownRiftShips),
  };
}
