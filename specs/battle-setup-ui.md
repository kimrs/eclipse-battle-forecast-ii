# Battle Setup UI — Eclipse Combat Forecast II

## File: `src/pages/BattlePage.tsx`

## Purpose

The Battle Setup page lets users configure a sector battle: which factions are involved, how many ships each brings, entry order, and NPC opponents. From here, users launch the simulation.

---

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Eclipse Combat Forecast II     [Blueprints]   [Results] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Battle Sector Setup                                    │
│                                                         │
│  Factions in Battle:                    [+ Add Faction] │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Faction: [My Fleet ▾]              [✕ Remove]      ││
│  │                                                     ││
│  │  Ships:                                             ││
│  │  Interceptors: [___2___]  Cruisers:    [___1___]    ││
│  │  Dreadnoughts: [___0___]  Starbases:   [___0___]    ││
│  │                                                     ││
│  │  Turn of Entry: [___1___]                           ││
│  │  ☑ Controls Sector (Defender)                       ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Faction: [Enemy ▾]                 [✕ Remove]      ││
│  │                                                     ││
│  │  Ships:                                             ││
│  │  Interceptors: [___3___]  Cruisers:    [___0___]    ││
│  │  Dreadnoughts: [___1___]  Starbases:   [___0___]    ││
│  │                                                     ││
│  │  Turn of Entry: [___3___]                           ││
│  │  ☐ Controls Sector                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  NPC Opponents:                          [+ Add NPC]    │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Type: [Ancient ▾]   Variant: [Normal ▾]           ││
│  │  Count: [___2___]                   [✕ Remove]      ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Simulation Settings:                                   │
│  Number of Simulations: [___100___]                     │
│  Dice Pool Size:        [___600___]                     │
│                                                         │
│  [▶ Run Simulation]                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### `BattlePage.tsx` (page)

State:
```typescript
interface BattlePageState {
  factionDeployments: FactionDeployment[];
  npcDeployments: NpcDeployment[];
  simulationConfig: SimulationConfig;
}
```

Responsibilities:
- Load available factions from localStorage (configured on Blueprint page)
- Manage faction deployments and NPC deployments
- Validate setup before running simulation
- On "Run Simulation": navigate to Results page with setup data (via React state/context or URL params)

### `FactionPanel.tsx` (component)

Props:
```typescript
interface FactionPanelProps {
  deployment: FactionDeployment;
  availableFactions: Faction[];
  onChange: (updated: FactionDeployment) => void;
  onRemove: () => void;
}
```

Displays:
- Faction selector dropdown (from available factions)
- Ship count inputs (number inputs, 0–max per type)
- Turn of entry input (positive integer)
- "Controls Sector" checkbox
- Remove button

### `BattleSetup.tsx` (component)

Wraps the list of FactionPanels and NPC panels. Manages add/remove logic.

---

## Interactions

### Adding a Faction
1. Click [+ Add Faction]
2. New FactionPanel appears with first available faction selected
3. Default: 0 ships of each type, turn of entry = next available number

### Adding an NPC
1. Click [+ Add NPC]
2. New NPC panel appears
3. Select type (Ancient / Guardian / GCDS)
4. Select variant (Normal / Advanced) — where applicable
5. Set count (default: 1)

### Removing a Faction/NPC
- Click [✕ Remove] on the panel
- No confirmation needed (easy to re-add)

### Validation Rules

Before "Run Simulation" is enabled:
- At least 2 combatants total (factions + NPCs)
- Each faction deployment must have at least 1 ship
- Ship counts must not exceed maximums:
  - Interceptors: 0–8
  - Cruisers: 0–4
  - Dreadnoughts: 0–2
  - Starbases: 0–4
- At most 1 faction can "Control Sector"
- Turn of entry values should be positive integers
- Dice pool size must be divisible by 6
- Number of simulations must be >= 1
- Selected factions must have blueprints configured (at least 1 part in each used ship type's blueprint)

### Validation Feedback
- Show inline error messages below invalid fields
- Disable "Run Simulation" button until all validation passes
- Show a summary of validation errors at the bottom if any exist

---

## Simulation Launch

When "Run Simulation" is clicked:
1. Collect all `FactionDeployment[]`, `NpcDeployment[]`, and `SimulationConfig`
2. Resolve full `Faction` objects from localStorage by `factionId`
3. Pass complete data to Results page (via React context, state, or serialized URL)
4. Navigate to Results page
5. Results page runs the simulation (potentially in a Web Worker to avoid UI freeze)

---

## Styling Notes

- Faction panels: card-style with subtle border, slight shadow
- Ship count inputs: compact number spinners
- NPC panels: visually distinct from faction panels (different border color or icon)
- "Run Simulation" button: prominent, primary color, disabled state when invalid
- Responsive: panels stack vertically on narrow screens
