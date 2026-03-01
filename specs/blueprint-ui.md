# Blueprint Configuration UI — Eclipse Combat Forecast II

## File: `src/pages/BlueprintPage.tsx`

## Purpose

The Blueprint Configuration page lets users create factions and configure ship blueprints for each ship type. This is the first step before setting up a battle.

---

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Eclipse Combat Forecast II            [Battle] [Results]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Factions                          [+ New Faction]      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ My Fleet │ │ Enemy    │ │ Pirates  │                 │
│  │ (active) │ │          │ │          │                 │
│  └──────────┘ └──────────┘ └──────────┘                │
│                                                         │
│  Faction: "My Fleet"  [Rename] [Delete] [Load Preset ▾] │
│                                                         │
│  ┌─────────────┬─────────────┬──────────────┬─────────┐│
│  │ Interceptor │  Cruiser    │ Dreadnought  │ Starbase││
│  └─────────────┴─────────────┴──────────────┴─────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Blueprint: Interceptor                             ││
│  │                                                     ││
│  │  Ship Part Slots:                                   ││
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      ││
│  │  │Ion     │ │Nuclear │ │Nuclear │ │ (empty)│      ││
│  │  │Cannon  │ │Drive   │ │Source  │ │        │      ││
│  │  │        │ │        │ │        │ │ [Add]  │      ││
│  │  └────────┘ └────────┘ └────────┘ └────────┘      ││
│  │  [Remove]   [Remove]   [Remove]                     ││
│  │                                                     ││
│  │  Stats Summary:                                     ││
│  │  Cannons: 1× Yellow                                ││
│  │  Missiles: —                                       ││
│  │  Computer: +0  Shield: -0  Hull: 0                 ││
│  │  Initiative: 2 (bonus: 0 + drives: 2)              ││
│  │  Energy: +3 / -1 = +2 ✓                            ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [Save to Browser]                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### `BlueprintPage.tsx` (page)

- Manages list of factions in state
- Renders faction tabs and the active faction's blueprint editor
- Handles faction CRUD (create, rename, delete)
- "Load Preset" dropdown loads a species preset into the active faction
- "Save to Browser" persists all factions to localStorage

### `BlueprintEditor.tsx` (component)

Props:
```typescript
interface BlueprintEditorProps {
  blueprint: Blueprint;
  onChange: (updated: Blueprint) => void;
}
```

Responsibilities:
- Display ship part slots as a grid of cards
- Each slot shows the part name and a [Remove] button
- Empty slots show an [Add] button that opens the ShipPartSelector
- Compute and display the stats summary below the slots
- Highlight energy balance: green if >= 0, red if negative
- Show slot count: `{usedSlots} / {maxSlots}`

### `ShipPartSelector.tsx` (component)

A modal or dropdown that lists all available ship parts from `SHIP_PARTS`.

Props:
```typescript
interface ShipPartSelectorProps {
  onSelect: (part: ShipPart) => void;
  onClose: () => void;
  excludeDrives?: boolean;  // true for Starbases (cannot have Drive parts)
}
```

Features:
- Filter/search by name
- Grouped by category (Weapons, Defense, Propulsion, Energy, Special)
- Shows part stats inline
- Clicking a part calls `onSelect` and closes

---

## Interactions

### Creating a Faction
1. Click [+ New Faction]
2. Prompted for a name (inline input or modal)
3. New faction created with empty blueprints (default slot counts per ship type)

### Loading a Species Preset
1. Click [Load Preset ▾] on active faction
2. Dropdown shows all 7 species
3. Selecting a species overwrites all 4 blueprints with species defaults
4. Confirmation dialog: "This will replace all blueprints for '{faction name}'. Continue?"

### Editing a Blueprint
1. Click a ship type tab (Interceptor/Cruiser/Dreadnought/Starbase)
2. The blueprint editor shows the slots for that ship type
3. Click [Add] on an empty slot to open the part selector
4. Click [Remove] on a filled slot to remove the part
5. Stats summary updates in real-time

### Validation Rules
- Cannot exceed max slot count for the ship type
- Starbases cannot have Drive parts (`excludeDrives: true`)
- Energy balance shown but not enforced (user can experiment freely)
- No duplicate part restriction (user can add multiple of the same part)

### Persistence
- "Save to Browser" writes all factions to `localStorage` under key `eclipse-factions`
- On page load, factions are loaded from localStorage if present
- Use `useLocalStorage` hook for reactive persistence

---

## Default Ship Type Properties

| Ship Type     | Slots | Initiative Bonus | Max Count |
|---------------|-------|-----------------|-----------|
| Interceptor   | 4     | 0               | 8         |
| Cruiser       | 6     | 0               | 4         |
| Dreadnought   | 8     | 0               | 2         |
| Starbase      | 5     | 4               | 4         |

> **Note**: Slot counts and initiative bonuses vary by species. The defaults above are for Terrans. Species presets override these values.

---

## Styling Notes

- Use Tailwind CSS utility classes
- Ship part cards: bordered cards with part name, subtle icon/color indicating category
- Active tab: highlighted with primary color
- Stats summary: compact table/grid layout
- Responsive: stack vertically on narrow screens
- Color-code die symbols: yellow/orange/blue/red backgrounds or text colors matching die colors
