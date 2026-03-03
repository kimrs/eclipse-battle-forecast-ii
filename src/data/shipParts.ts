import type { ShipPart } from '../types/game';

const DEFAULTS: Omit<ShipPart, 'id' | 'name'> = {
  cannons: [],
  missiles: [],
  computers: 0,
  shields: 0,
  hull: 0,
  initiative: 0,
  energyProduction: 0,
  energyConsumption: 0,
};

function defineShipPart(
  id: string,
  name: string,
  overrides: Partial<Omit<ShipPart, 'id' | 'name'>>
): ShipPart {
  return { ...DEFAULTS, ...overrides, id, name };
}

export const SHIP_PARTS: ShipPart[] = [
  // --- Weapons (Cannons) ---
  defineShipPart('ion-cannon', 'Ion Cannon', {
    cannons: [{ color: 'yellow', count: 1 }],
    energyConsumption: 1,
  }),
  defineShipPart('plasma-cannon', 'Plasma Cannon', {
    cannons: [{ color: 'orange', count: 1 }],
    energyConsumption: 2,
  }),
  defineShipPart('soliton-cannon', 'Soliton Cannon', {
    cannons: [{ color: 'blue', count: 1 }],
    energyConsumption: 3,
  }),
  defineShipPart('antimatter-cannon', 'Antimatter Cannon', {
    cannons: [{ color: 'red', count: 1 }],
    energyConsumption: 4,
    isAntimatter: true,
  }),
  defineShipPart('rift-cannon', 'Rift Cannon', {
    cannons: [{ color: 'pink', count: 1 }],
    energyConsumption: 2,
    isRiftWeapon: true,
    requiresTech: 'Rare Tech',
  }),

  // --- Weapons (Missiles) ---
  defineShipPart('ion-missile', 'Ion Missile', {
    missiles: [{ color: 'yellow', count: 1 }],
    energyConsumption: 1,
  }),
  defineShipPart('plasma-missile', 'Plasma Missile', {
    missiles: [{ color: 'orange', count: 1 }],
    energyConsumption: 2,
  }),
  defineShipPart('antimatter-missile', 'Antimatter Missile', {
    missiles: [{ color: 'red', count: 1 }],
    energyConsumption: 3,
    isAntimatter: true,
  }),

  // --- Defense ---
  defineShipPart('hull', 'Hull', { hull: 1 }),
  defineShipPart('improved-hull', 'Improved Hull', { hull: 2 }),
  defineShipPart('electron-computer', 'Electron Computer', {
    computers: 1,
    energyConsumption: 1,
  }),
  defineShipPart('positron-computer', 'Positron Computer', {
    computers: 2,
    energyConsumption: 2,
  }),
  defineShipPart('gluon-computer', 'Gluon Computer', {
    computers: 3,
    energyConsumption: 3,
  }),
  defineShipPart('gauss-shield', 'Gauss Shield', {
    shields: 1,
    energyConsumption: 1,
  }),
  defineShipPart('phase-shield', 'Phase Shield', {
    shields: 2,
    energyConsumption: 2,
  }),

  // --- Propulsion ---
  defineShipPart('nuclear-drive', 'Nuclear Drive', {
    initiative: 1,
    energyConsumption: 1,
  }),
  defineShipPart('fusion-drive', 'Fusion Drive', {
    initiative: 2,
    energyConsumption: 2,
  }),
  defineShipPart('tachyon-drive', 'Tachyon Drive', {
    initiative: 3,
    energyConsumption: 3,
  }),

  // --- Energy ---
  defineShipPart('nuclear-source', 'Nuclear Source', { energyProduction: 3 }),
  defineShipPart('fusion-source', 'Fusion Source', { energyProduction: 6 }),
  defineShipPart('tachyon-source', 'Tachyon Source', { energyProduction: 9 }),

  // --- Special ---
  defineShipPart('rift-conductor', 'Rift Conductor', {
    cannons: [{ color: 'pink', count: 1 }],
    hull: 1,
    energyConsumption: 1,
    isRiftWeapon: true,
  }),
];
