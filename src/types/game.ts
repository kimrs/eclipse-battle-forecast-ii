// Dice Types

export type DieValue = 2 | 3 | 4 | 5 | 'star' | 'blank';

export interface DieFace {
  value: DieValue;       // 'star' = always hit, 'blank' = always miss, number = compare vs threshold
  damage: number;        // damage dealt to target on hit
  selfDamage?: number;   // damage dealt to own ship (Rift Cannon backfire)
}

export type DieColor = 'yellow' | 'orange' | 'blue' | 'red' | 'pink';

export interface DieDefinition {
  color: DieColor;
  faces: [DieFace, DieFace, DieFace, DieFace, DieFace, DieFace]; // exactly 6 faces
  ignoresShields?: boolean;    // Rift Cannon: bypasses target shields
  ignoresComputers?: boolean;  // Rift Cannon: bypasses attacker computers
}

// Ship Part Types

export interface DieSymbol {
  color: DieColor;
  count: number; // number of dice of this color
}

export interface ShipPart {
  id: string;
  name: string;
  cannons: DieSymbol[];    // dice rolled during engagement rounds
  missiles: DieSymbol[];   // dice rolled during missile phase (once)
  computers: number;       // added to die rolls
  shields: number;         // subtracted from opponent die rolls targeting this ship
  hull: number;            // damage absorption
  initiative: number;      // initiative contribution
  energyProduction: number; // positive = produces energy
  energyConsumption: number; // positive = consumes energy
  isAntimatter?: boolean;  // Antimatter Cannon/Splitter: damage can be split freely
  isRiftWeapon?: boolean;  // Rift Cannon/Conductor: ship can receive backfire damage
  requiresTech?: string;   // tech name required to use this part
}

// Blueprint Types

export type ShipType = 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase';

export interface Blueprint {
  shipType: ShipType;
  initiativeBonus: number; // printed on the blueprint tile
  slots: number;           // max number of ship part slots
  parts: ShipPart[];       // currently equipped parts
  // Innate bonuses (species-specific, don't occupy slots)
  innateComputers?: number;
  innateShields?: number;
  innateHull?: number;
  innateInitiative?: number;
  innateEnergyProduction?: number;
}

// Faction Types

export interface Faction {
  id: string;
  name: string;
  blueprints: Record<ShipType, Blueprint>;
  hasAntimatterSplitter?: boolean;
}

// Battle Setup Types

export type NpcType = 'ancient' | 'guardian' | 'gcds';

export interface FactionDeployment {
  id: string;                // unique instance ID (allows duplicate factions)
  factionId: string;
  ships: { type: ShipType; count: number }[];
  turnOfEntry: number;       // lower = entered earlier
  controlsSector: boolean;   // true = this faction is the sector Defender
}

export interface NpcDeployment {
  id: string;                // unique instance ID for React keys
  type: NpcType;
  blueprint: Blueprint;      // uses NPC blueprint tile
  count: number;             // number of NPC ships
  turnOfEntry: number;       // NPC join order
}

export interface SectorSetup {
  factions: FactionDeployment[];
  npcs: NpcDeployment[];
}

export interface SimulationConfig {
  runs: number;       // default 100
  dicePool: number;   // default 600 — must be divisible by 6
}

// Simulation Result Types

export interface ShipSurvival {
  type: ShipType;
  count: number;
}

export interface FactionResult {
  factionId: string;
  wins: number;
  avgSurvivors: Record<ShipType, number>;
}

export interface BattleEvent {
  phase: 'missile' | 'cannon';
  round: number;           // 0 for missiles, 1+ for engagement
  factionId: string;
  targetFactionId: string;
  shipType: ShipType;
  shipCount: number;
  dice: { color: DieColor; value: DieValue }[];
  hits: number;
  damageDealt: number;
  kills: { type: ShipType; count: number }[];
}

export interface SimulationRunResult {
  winnerId: string | null;  // null = mutual destruction
  survivors: { factionId: string; ships: ShipSurvival[] }[];
  events?: BattleEvent[];
}

export interface SimulationResults {
  config: SimulationConfig;
  runs: SimulationRunResult[];
  summary: FactionResult[];
}

// Battle Runtime Types (internal to engine)

export interface BlueprintStats {
  cannons: DieSymbol[];
  missiles: DieSymbol[];
  computers: number;
  shields: number;
  hull: number;
  initiative: number;
}

export interface BattleShip {
  id: string;              // unique per ship instance
  factionId: string;
  blueprint: Blueprint;
  stats: BlueprintStats;   // pre-computed once at creation, avoids hot-loop recomputation
  currentHull: number;     // remaining HP, starts at totalHull
  hasFiredMissiles: boolean;
  hasRiftWeapon: boolean;  // true if any part has isRiftWeapon — eligible for backfire
}
