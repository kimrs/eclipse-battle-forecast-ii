import type {
  BattleShip,
  Blueprint,
  Faction,
  FactionResult,
  SectorSetup,
  ShipSurvival,
  ShipType,
  SimulationConfig,
  SimulationResults,
  SimulationRunResult,
} from '../types/game';
import { computeBlueprintStats } from '../types/game';
import type { DiceEngine } from './diceEngine';
import { createDiceEngine } from './diceEngine';
import { resolveInitiativeOrder } from './initiativeResolver';
import { resolveHits } from './hitAssignment';
import type { PendingDieResult } from './hitAssignment';
import { DICE } from '../data/dice';

// ── Ship Creation ──────────────────────────────────────────────────────────

function createBattleShips(
  factionId: string,
  blueprint: Blueprint,
  count: number,
  idPrefix: string,
): BattleShip[] {
  const stats = computeBlueprintStats(blueprint);
  const hasRiftWeapon = blueprint.parts.some(p => p.isRiftWeapon);
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    factionId,
    blueprint,
    currentHull: stats.hull,
    hasFiredMissiles: false,
    hasRiftWeapon,
  }));
}

// ── Dice Helpers ──────────────────────────────────────────────────────────

function buildDieResults(
  firingShips: BattleShip[],
  diceEngine: DiceEngine,
  getMissiles: boolean,
): PendingDieResult[] {
  if (firingShips.length === 0) return [];
  const computers = computeBlueprintStats(firingShips[0].blueprint).computers;
  const results: PendingDieResult[] = [];
  for (const ship of firingShips) {
    for (const part of ship.blueprint.parts) {
      const symbols = getMissiles ? part.missiles : part.cannons;
      for (const sym of symbols) {
        if (sym.count === 0) continue;
        const dieDef = DICE[sym.color];
        const isRift = !!(dieDef.ignoresShields && dieDef.ignoresComputers);
        const faces = diceEngine.rollMultiple(sym.color, sym.count);
        for (const face of faces) {
          results.push({
            faceValue: face.value,
            damage: face.damage,
            selfDamage: face.selfDamage ?? 0,
            isAntimatter: !!part.isAntimatter,
            isRift,
            attackerComputers: computers,
          });
        }
      }
    }
  }
  return results;
}

// ── Damage Helpers ────────────────────────────────────────────────────────

function applyAssignments(
  ships: BattleShip[],
  assignments: Array<{ targetShipId: string; damage: number }>,
): void {
  const map = new Map(ships.map(s => [s.id, s]));
  for (const a of assignments) {
    const ship = map.get(a.targetShipId);
    if (ship) ship.currentHull -= a.damage;
  }
}

function removeDead(ships: BattleShip[]): BattleShip[] {
  return ships.filter(s => s.currentHull >= 0);
}

function hasCannonDice(ships: BattleShip[]): boolean {
  return ships.some(s =>
    computeBlueprintStats(s.blueprint).cannons.some(c => c.count > 0),
  );
}

function buildBlueprints(ships: BattleShip[]): Record<ShipType, Blueprint> {
  const seen = new Map<ShipType, Blueprint>();
  for (const s of ships) seen.set(s.blueprint.shipType, s.blueprint);
  return Object.fromEntries(seen.entries()) as Record<ShipType, Blueprint>;
}

function shipsToSurvival(ships: BattleShip[]): ShipSurvival[] {
  const counts = new Map<ShipType, number>();
  for (const s of ships) counts.set(s.blueprint.shipType, (counts.get(s.blueprint.shipType) ?? 0) + 1);
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

// ── Battle Pair ────────────────────────────────────────────────────────────

export interface BattlePairResult {
  winnerId: string | null;
  survivors: BattleShip[];
  rounds: number;
}

export function resolveBattlePair(
  attacker: { factionId: string; ships: BattleShip[] },
  defender: { factionId: string; ships: BattleShip[] },
  diceEngine: DiceEngine,
  isNpcDefender: boolean,
): BattlePairResult {
  let aShips: BattleShip[] = attacker.ships.map(s => ({ ...s }));
  let dShips: BattleShip[] = defender.ships.map(s => ({ ...s }));
  const aId = attacker.factionId;
  const dId = defender.factionId;

  function getOrder() {
    const aTypes = [...new Set(aShips.map(s => s.blueprint.shipType))];
    const dTypes = [...new Set(dShips.map(s => s.blueprint.shipType))];
    if (aTypes.length === 0 && dTypes.length === 0) return [];
    return resolveInitiativeOrder(
      aId, dId,
      buildBlueprints(aShips),
      buildBlueprints(dShips),
      aTypes, dTypes,
    );
  }

  function fireShipType(
    firingFactionId: string,
    shipType: ShipType,
    myShips: BattleShip[],
    enemyShips: BattleShip[],
    getMissiles: boolean,
  ): { my: BattleShip[]; enemy: BattleShip[] } {
    const group = myShips.filter(s => s.blueprint.shipType === shipType);
    if (group.length === 0 || enemyShips.length === 0) return { my: myShips, enemy: enemyShips };
    const dieResults = buildDieResults(group, diceEngine, getMissiles);
    if (dieResults.length === 0) return { my: myShips, enemy: enemyShips };
    const isNpcFiring = isNpcDefender && firingFactionId === dId;
    const ownRiftShips = group.filter(s => s.hasRiftWeapon);
    const resolved = resolveHits(dieResults, enemyShips, ownRiftShips, isNpcFiring);
    applyAssignments(enemyShips, resolved.enemyDamage);
    applyAssignments(myShips, resolved.backfireDamage);
    return { my: removeDead(myShips), enemy: removeDead(enemyShips) };
  }

  // Missile phase
  const missileOrder = getOrder();
  for (const entry of missileOrder) {
    if (aShips.length === 0 || dShips.length === 0) break;
    const isAttacker = entry.factionId === aId;
    if (isAttacker) {
      const r = fireShipType(aId, entry.shipType, aShips, dShips, true);
      aShips = r.my; dShips = r.enemy;
    } else {
      const r = fireShipType(dId, entry.shipType, dShips, aShips, true);
      dShips = r.my; aShips = r.enemy;
    }
  }

  // Engagement rounds
  let rounds = 0;
  const MAX_ROUNDS = 200;
  while (aShips.length > 0 && dShips.length > 0 && rounds < MAX_ROUNDS) {
    // Stalemate: neither side has cannon dice → attacker loses
    if (!hasCannonDice(aShips) && !hasCannonDice(dShips)) {
      aShips = [];
      break;
    }
    rounds++;
    const order = getOrder();
    for (const entry of order) {
      if (aShips.length === 0 || dShips.length === 0) break;
      const isAttacker = entry.factionId === aId;
      if (isAttacker) {
        const r = fireShipType(aId, entry.shipType, aShips, dShips, false);
        aShips = r.my; dShips = r.enemy;
      } else {
        const r = fireShipType(dId, entry.shipType, dShips, aShips, false);
        dShips = r.my; aShips = r.enemy;
      }
    }
  }

  const aAlive = aShips.length > 0;
  const dAlive = dShips.length > 0;
  const winnerId = aAlive && !dAlive ? aId : dAlive && !aAlive ? dId : null;
  const survivors = winnerId === aId ? aShips : winnerId === dId ? dShips : [];

  return { winnerId, survivors, rounds };
}

// ── Sector Battle ─────────────────────────────────────────────────────────

export interface SectorBattleResult {
  winnerId: string | null;
  survivors: { factionId: string; ships: ShipSurvival[] }[];
  battleLog: BattlePairResult[];
}

export function simulateSectorBattle(
  setup: SectorSetup,
  factions: Record<string, Faction>,
  diceEngine: DiceEngine,
): SectorBattleResult {
  // Build battle ships for player factions
  const shipMap = new Map<string, BattleShip[]>();
  for (const dep of setup.factions) {
    const faction = factions[dep.factionId];
    const ships: BattleShip[] = [];
    for (const { type, count } of dep.ships) {
      ships.push(...createBattleShips(dep.factionId, faction.blueprints[type], count, `${dep.factionId}-${type}`));
    }
    shipMap.set(dep.factionId, ships);
  }

  // Build battle ships for NPCs (synthetic IDs)
  const npcQueue: Array<{ factionId: string; isNpc: true }> = [];
  for (let i = 0; i < setup.npcs.length; i++) {
    const npc = setup.npcs[i];
    const npcId = `npc-${npc.type}-${i}`;
    shipMap.set(npcId, createBattleShips(npcId, npc.blueprint, npc.count, npcId));
    npcQueue.push({ factionId: npcId, isNpc: true });
  }

  // Build battle order: non-controller factions sorted by turnOfEntry desc, then controller, then NPCs
  const controllerDep = setup.factions.find(f => f.controlsSector);
  const nonControllers = setup.factions
    .filter(f => !f.controlsSector)
    .sort((a, b) => b.turnOfEntry - a.turnOfEntry);

  const battleQueue: Array<{ factionId: string; isNpc: boolean }> = [
    ...nonControllers.map(f => ({ factionId: f.factionId, isNpc: false })),
    ...(controllerDep ? [{ factionId: controllerDep.factionId, isNpc: false }] : []),
    ...npcQueue,
  ];

  if (battleQueue.length === 0) return { winnerId: null, survivors: [], battleLog: [] };

  if (battleQueue.length === 1) {
    const { factionId } = battleQueue[0];
    const ships = shipMap.get(factionId) ?? [];
    return {
      winnerId: factionId,
      survivors: [{ factionId, ships: shipsToSurvival(ships) }],
      battleLog: [],
    };
  }

  const battleLog: BattlePairResult[] = [];
  let currentId = battleQueue[0].factionId;
  let currentIsNpc = battleQueue[0].isNpc;
  let currentShips = shipMap.get(currentId)!;

  for (let i = 1; i < battleQueue.length; i++) {
    const next = battleQueue[i];
    const nextShips = shipMap.get(next.factionId)!;

    const result = resolveBattlePair(
      { factionId: currentId, ships: currentShips },
      { factionId: next.factionId, ships: nextShips },
      diceEngine,
      next.isNpc,
    );
    battleLog.push(result);

    if (result.winnerId === null) {
      return { winnerId: null, survivors: [], battleLog };
    }

    currentId = result.winnerId;
    currentIsNpc = result.winnerId === next.factionId ? next.isNpc : currentIsNpc;
    currentShips = result.survivors;
  }

  return {
    winnerId: currentId,
    survivors: [{ factionId: currentId, ships: shipsToSurvival(currentShips) }],
    battleLog,
  };
}

// ── Monte Carlo Runner ────────────────────────────────────────────────────

export function runSimulations(
  setup: SectorSetup,
  factions: Record<string, Faction>,
  config: SimulationConfig,
): SimulationResults {
  const diceEngine = createDiceEngine(config.dicePool);

  const allFactionIds = [
    ...setup.factions.map(f => f.factionId),
    ...setup.npcs.map((npc, i) => `npc-${npc.type}-${i}`),
  ];

  const winCounts = new Map<string, number>(allFactionIds.map(id => [id, 0]));
  const survivorSums = new Map<string, Map<ShipType, number>>(
    allFactionIds.map(id => [id, new Map()]),
  );

  const runs: SimulationRunResult[] = [];

  for (let i = 0; i < config.runs; i++) {
    const result = simulateSectorBattle(setup, factions, diceEngine);
    const runResult: SimulationRunResult = {
      winnerId: result.winnerId,
      survivors: result.survivors,
    };
    runs.push(runResult);

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
  }

  const summary: FactionResult[] = allFactionIds.map(id => {
    const sums = survivorSums.get(id) ?? new Map<ShipType, number>();
    const avgSurvivors: Record<ShipType, number> = {
      interceptor: (sums.get('interceptor') ?? 0) / config.runs,
      cruiser: (sums.get('cruiser') ?? 0) / config.runs,
      dreadnought: (sums.get('dreadnought') ?? 0) / config.runs,
      starbase: (sums.get('starbase') ?? 0) / config.runs,
    };
    return {
      factionId: id,
      wins: winCounts.get(id) ?? 0,
      avgSurvivors,
      avgDamageDealt: 0,
    };
  });

  return { config, runs, summary };
}
