import type { NpcType, Blueprint } from '../types/game';
import { SHIP_PARTS } from './shipParts';

function getPart(id: string) {
  const part = SHIP_PARTS.find(p => p.id === id);
  if (!part) throw new Error(`Ship part not found: ${id}`);
  return part;
}

export const NPC_BLUEPRINTS: Record<NpcType, { normal: Blueprint; advanced?: Blueprint }> = {
  ancient: {
    normal: {
      shipType: 'interceptor',
      initiativeBonus: 0,
      slots: 4,
      parts: [
        getPart('ion-cannon'),
        getPart('plasma-cannon'),
        getPart('electron-computer'),
        getPart('hull'),
      ],
    },
    advanced: {
      shipType: 'interceptor',
      initiativeBonus: 0,
      slots: 5,
      parts: [
        getPart('ion-cannon'),
        getPart('plasma-cannon'),
        getPart('antimatter-cannon'),
        getPart('electron-computer'),
        getPart('improved-hull'),
      ],
    },
  },
  guardian: {
    normal: {
      shipType: 'cruiser',
      initiativeBonus: 0,
      slots: 4,
      parts: [
        getPart('ion-cannon'),
        getPart('plasma-cannon'),
        getPart('electron-computer'),
        getPart('improved-hull'),
      ],
    },
    advanced: {
      shipType: 'cruiser',
      initiativeBonus: 0,
      slots: 6,
      parts: [
        getPart('ion-cannon'),
        getPart('plasma-cannon'),
        getPart('soliton-cannon'),
        getPart('positron-computer'),
        getPart('improved-hull'),
        getPart('hull'),
      ],
    },
  },
  gcds: {
    normal: {
      shipType: 'dreadnought',
      initiativeBonus: 0,
      slots: 9,
      parts: [
        getPart('ion-cannon'),
        getPart('plasma-cannon'),
        getPart('soliton-cannon'),
        getPart('antimatter-cannon'),
        getPart('electron-computer'),
        getPart('improved-hull'),
        getPart('improved-hull'),
        getPart('improved-hull'),
        getPart('hull'),
      ],
    },
  },
};
