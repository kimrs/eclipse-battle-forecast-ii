# Combat Engine — Eclipse Combat Forecast II

## Files

- `src/engine/combatEngine.ts` — Main battle simulation orchestrator
- `src/engine/hitAssignment.ts` — Optimal hit assignment algorithm
- `src/engine/initiativeResolver.ts` — Initiative ordering logic

---

## Overview

The combat engine simulates a full battle in a sector. A sector may contain ships from multiple factions plus NPC opponents. The engine resolves combat pairwise, determines winners, and reports final results.

---

## File: `src/engine/initiativeResolver.ts`

### Purpose
Determine the firing order of ship types in a battle.

### Initiative Calculation

Per ship type in a faction:
```
initiative = blueprint.initiativeBonus + sum(part.initiative for part in blueprint.parts)
```

### Ordering Rules

1. All ship types from both sides are collected into a single list
2. Sorted by initiative value, **descending** (highest fires first)
3. **Ties**: Defender's ship type fires before Attacker's ship type
4. Within the same faction at the same initiative, order doesn't matter (they target the same enemy)

### API

```typescript
interface InitiativeEntry {
  factionId: string;
  shipType: ShipType;
  initiative: number;
  isDefender: boolean;
}

function resolveInitiativeOrder(
  attackerFactionId: string,
  defenderFactionId: string,
  attackerBlueprints: Record<ShipType, Blueprint>,
  defenderBlueprints: Record<ShipType, Blueprint>,
  attackerShipTypes: ShipType[],  // only types actually present in battle
  defenderShipTypes: ShipType[]
): InitiativeEntry[];
```

---

## File: `src/engine/hitAssignment.ts`

### Purpose
Given a set of dice results (hits with damage values), assign them to enemy ships to maximize the number of ships destroyed.

### Hit Determination

A die result is a **hit** if:
- `face.value === 'star'` → always hit (regardless of computers/shields)
- `face.value === 'blank'` → always miss
- Otherwise: `face.value + attackerComputers - targetShields >= 6` → hit

**Rift Cannon exception**: Rift dice (`pink`) ignore both computers and shields entirely. Their faces are either `'star'` (auto-hit with damage) or `'blank'` (miss). No numeric comparison is ever performed for Rift dice.

**Important**: Shield value is per-target-ship. A die result may hit one target but miss another (if shields differ). The assignment algorithm must account for this. (This does not apply to Rift dice, which bypass shields.)

### Optimal Assignment Algorithm

**Input**:
- List of hit results: `{ damage: number, isAntimatter: boolean }[]`
- List of enemy ships: `{ id: string, currentHull: number, shields: number }[]`
- Attacker's total computer value

**Goal**: Maximize number of enemy ships destroyed.

**Strategy (for player factions)**:
1. For each enemy ship, calculate effective damage needed: `currentHull + 1` (hull = damage it can absorb, so `hull + 1` damage destroys it)
2. Prioritize destroying ships that require the least total damage (smallest first)
3. Assign hits greedily:
   - Sort potential targets by remaining hull ascending
   - For each target, check if available hits can destroy it
   - Assign minimum hits needed to destroy; mark those hits as used
   - Remaining unassigned hits go to the largest surviving ship (to chip away hull)
4. **Antimatter hits**: If `isAntimatter`, damage from that hit can be split freely across multiple targets. Treat antimatter damage as a fungible pool.

**Strategy (for NPC factions — Ancients/Guardians/GCDS)**:
- Per rulebook: assign hits to destroy **largest to smallest** ships
- This is the opposite of the player optimal strategy

### Damage Application

- Each hit deals `face.damage` points of damage to the target
- Damage reduces `currentHull` of the assigned target
- Ship is destroyed when `currentHull < 0` (hull represents absorption capacity; 0 hull means 1 more damage destroys it)
- **Excess damage is lost** — cannot overflow to another ship (unless antimatter splitter)

### Rift Cannon Backfire

When a Rift die face has `selfDamage > 0`, the firing faction takes backfire damage to its own ships:

1. **Eligible ships**: Only ships with `hasRiftWeapon: true` (ships equipped with Rift Cannon or Rift Conductor parts) can receive backfire damage
2. **Assignment priority**: Try to destroy own Rift-armed ships, **largest to smallest** (by hull)
3. **If none can be destroyed**: Assign damage to inflict maximum damage, **largest to smallest**
4. Backfire damage is applied immediately after the Rift dice are resolved for that ship type's activation
5. Backfire can destroy the firing faction's own ships mid-round

### API

```typescript
interface HitResult {
  damage: number;
  isAntimatter: boolean;
  selfDamage: number;    // Rift backfire damage (0 for non-Rift dice)
  isRift: boolean;       // true for Rift Cannon dice
}

interface DamageAssignment {
  targetShipId: string;
  damage: number;
}

interface BackfireAssignment {
  targetShipId: string;  // own ship receiving backfire
  damage: number;
}

function assignHitsOptimally(
  hits: HitResult[],
  enemies: BattleShip[],
  isNpc: boolean  // true = use NPC assignment (largest first)
): DamageAssignment[];

function assignBackfireDamage(
  totalBackfire: number,
  ownShips: BattleShip[]  // only ships with hasRiftWeapon
): BackfireAssignment[];
// Assigns backfire: try to destroy largest Rift-armed ships first.
// If none can be destroyed, assign to largest for max damage.
```

### Shield Interaction with Hit Determination

Since shields vary per target, hit determination is interleaved with assignment:

```typescript
interface PendingDieResult {
  faceValue: DieValue;
  damage: number;
  selfDamage: number;       // Rift backfire (0 for non-Rift)
  isAntimatter: boolean;
  isRift: boolean;           // Rift dice bypass computers/shields
  attackerComputers: number; // ignored for Rift dice
}

interface ResolvedHits {
  enemyDamage: DamageAssignment[];
  backfireDamage: BackfireAssignment[];
}

function resolveHits(
  dieResults: PendingDieResult[],
  enemies: BattleShip[],
  ownRiftShips: BattleShip[],  // own ships with Rift weapons (for backfire)
  isNpc: boolean
): ResolvedHits;
```

This function:
1. Separates stars (always hit) and blanks (always miss)
2. For Rift dice: all non-blank faces auto-hit (no computer/shield check)
3. For standard dice: determines which enemies each die can hit (accounting for shields)
4. Runs optimal assignment considering per-target hit eligibility
5. Collects total `selfDamage` from Rift dice and assigns backfire to own Rift-armed ships

---

## File: `src/engine/combatEngine.ts`

### Purpose
Orchestrate a full sector battle: determine pairings, run missile phase, run engagement rounds, track ship state, and return results.

### Multi-Faction Battle Resolution

When multiple factions are in a sector:

1. Sort factions by `turnOfEntry` descending (last to enter = first to fight as Attacker)
2. The faction that `controlsSector` is always Defender in its battle (fights last)
3. NPC opponents (Ancients/Guardians/GCDS) are always Defender and fight the last surviving player faction
4. Resolve battles pairwise:
   - Pair 1: Latest entrant (Attacker) vs second-latest (Defender)
   - Winner of Pair 1 fights the next faction, and so on
   - Final pair: last surviving player vs NPC (if present) or sector controller

### Battle Pair Resolution

```typescript
interface BattlePairResult {
  winnerId: string | null;    // null = mutual destruction
  survivors: BattleShip[];
  rounds: number;             // number of engagement rounds
}

function resolveBattlePair(
  attacker: { factionId: string; ships: BattleShip[] },
  defender: { factionId: string; ships: BattleShip[] },
  diceEngine: DiceEngine,
  isNpcDefender: boolean
): BattlePairResult;
```

### Battle Pair Steps

#### 1. Calculate Initiative Order
- Call `resolveInitiativeOrder()` with ship types present in this battle
- This order is used for both missile and engagement phases

#### 2. Missile Phase (once)
For each ship type in initiative order:
1. Count total missile dice by color across all surviving ships of this type
2. Roll dice using `diceEngine.rollMultiple(color, count)` for each color
3. Resolve hits against enemy ships using `resolveHits()`
4. Apply damage, remove destroyed ships
5. Mark all ships of this type as `hasFiredMissiles = true`

#### 3. Engagement Rounds (repeat)
Loop until one side has no ships:

For each ship type in initiative order:
1. Count total cannon dice by color across all surviving ships of this type
2. Roll dice using `diceEngine.rollMultiple(color, count)` for each color
3. Resolve hits against enemy ships
4. Apply damage, remove destroyed ships
5. Check if battle is over (one side eliminated)

#### 4. Stalemate Detection
After each engagement round, check:
- If neither side has any cannon dice (missiles-only or unarmed ships remaining)
- If so, **Attacker's remaining ships are destroyed** (Attacker loses stalemate)

### GCDS Special Rule
- GCDS **pins** all ships — no retreat possible
- In this simulator, retreat is not modeled anyway (fight to death), so this mainly affects flavor/logging
- GCDS uses its own blueprint tile

### Full Sector Simulation

```typescript
interface SectorBattleResult {
  winnerId: string | null;
  survivors: { factionId: string; ships: ShipSurvival[] }[];
  battleLog: BattlePairResult[];  // ordered sequence of pair battles
}

function simulateSectorBattle(
  setup: SectorSetup,
  factions: Record<string, Faction>,
  diceEngine: DiceEngine
): SectorBattleResult;
```

### Monte Carlo Runner

```typescript
function runSimulations(
  setup: SectorSetup,
  factions: Record<string, Faction>,
  config: SimulationConfig
): SimulationResults;
```

This function:
1. Creates a `DiceEngine` with `config.dicePool` pool size
2. Runs `config.runs` iterations of `simulateSectorBattle()`
3. Resets the dice engine between runs (optional — each run gets fresh draws from reshuffled pools)
4. Aggregates results into `SimulationResults`

### Aggregation

After all runs:
- Count wins per faction
- Compute average survivors per ship type per faction
- Compute average damage dealt per faction
- Handle ties / mutual destruction (winnerId = null)

---

## Testing Requirements

### Initiative Tests
- Verify ordering with known initiative values
- Verify tie-breaking favors Defender
- Verify only ship types actually present are included

### Hit Assignment Tests
- 2 Interceptors (hull 0 each), 2 hits of 1 damage each → both destroyed
- 1 Dreadnought (hull 2), 3 hits of 1 damage each → destroyed (3 > 2)
- 1 Dreadnought (hull 2), 2 hits of 1 damage each → not destroyed (2 = 2, need 3)
- Optimal: choose to destroy 2 small ships over damaging 1 large ship
- NPC assignment: destroy largest first

### Rift Cannon Tests
- Rift hit ignores target shields (shield value irrelevant)
- Rift hit ignores attacker computers (computer value irrelevant)
- Backfire damage assigned to own Rift-armed ships only
- Backfire assignment: largest Rift-armed ship first
- Mixed Rift + standard dice in same activation: standard dice use computers/shields, Rift dice don't
- Backfire can destroy own ships mid-round

### Combat Engine Tests
- Simple 1v1: 1 Interceptor vs 1 Interceptor with deterministic dice
- Missile phase fires before engagement
- Stalemate: unarmed ships → Attacker loses
- Multi-faction: 3-way battle resolves in correct pairing order

### Integration Test
- Replicate rulebook example (Johanna vs Vernor, pages 22-23)
- Verify plausible win rates over 1000 simulations
