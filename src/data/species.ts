import type { ShipType } from '../types/game';

export interface SpeciesPreset {
  id: string;
  name: string;
  blueprints: Record<ShipType, {
    initiativeBonus: number;
    slots: number;
    defaultParts: string[]; // ShipPart IDs
  }>;
}

export const SPECIES_PRESETS: SpeciesPreset[] = [
  {
    // Terran: starts with Ion Missile on Interceptor instead of Ion Cannon
    id: 'terran',
    name: 'Terran',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-missile'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'ion-cannon', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'electron-computer'],
      },
    },
  },
  {
    // Eridani Empire: wealth-focused, standard ship layouts
    id: 'eridani',
    name: 'Eridani Empire',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-cannon'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'ion-cannon', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'electron-computer'],
      },
    },
  },
  {
    // Hydran Progress: tech-focused, starts with Plasma Cannon on Dreadnought
    id: 'hydran',
    name: 'Hydran Progress',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-cannon'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'plasma-cannon', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'electron-computer'],
      },
    },
  },
  {
    // Planta: biological faction, extra hull on ships
    id: 'planta',
    name: 'Planta',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-cannon'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'hull', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'ion-cannon', 'hull', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'electron-computer', 'hull'],
      },
    },
  },
  {
    // Descendants of Draco: ancient tech specialists, extra hull
    id: 'draco',
    name: 'Descendants of Draco',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-cannon', 'hull'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'hull', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'ion-cannon', 'hull', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'electron-computer', 'hull'],
      },
    },
  },
  {
    // Mechanema: automated robots, extra computer bonus
    id: 'mechanema',
    name: 'Mechanema',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-cannon'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'electron-computer', 'ion-cannon', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'electron-computer', 'ion-cannon', 'ion-cannon', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'electron-computer', 'electron-computer'],
      },
    },
  },
  {
    // Orion Hegemony: aggressive pirates, extra weapons on Interceptor
    id: 'orion',
    name: 'Orion Hegemony',
    blueprints: {
      interceptor: {
        initiativeBonus: 2,
        slots: 4,
        defaultParts: ['nuclear-source', 'nuclear-drive', 'ion-cannon', 'ion-cannon'],
      },
      cruiser: {
        initiativeBonus: 1,
        slots: 6,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'ion-cannon', 'hull'],
      },
      dreadnought: {
        initiativeBonus: 0,
        slots: 8,
        defaultParts: ['nuclear-source', 'electron-computer', 'ion-cannon', 'ion-cannon', 'ion-cannon', 'hull'],
      },
      starbase: {
        initiativeBonus: 4,
        slots: 5,
        defaultParts: ['ion-cannon', 'ion-cannon', 'ion-cannon', 'electron-computer'],
      },
    },
  },
];
