import type { DieColor, DieDefinition } from '../types/game';

export const DICE: Record<DieColor, DieDefinition> = {
  yellow: {
    color: 'yellow',
    faces: [
      { value: 'star', damage: 1 },
      { value: 5, damage: 1 },
      { value: 4, damage: 1 },
      { value: 3, damage: 1 },
      { value: 2, damage: 1 },
      { value: 'blank', damage: 0 },
    ],
  },
  orange: {
    color: 'orange',
    faces: [
      { value: 'star', damage: 2 },
      { value: 5, damage: 2 },
      { value: 4, damage: 2 },
      { value: 3, damage: 2 },
      { value: 2, damage: 2 },
      { value: 'blank', damage: 0 },
    ],
  },
  blue: {
    color: 'blue',
    faces: [
      { value: 'star', damage: 3 },
      { value: 5, damage: 3 },
      { value: 4, damage: 3 },
      { value: 3, damage: 3 },
      { value: 2, damage: 3 },
      { value: 'blank', damage: 0 },
    ],
  },
  red: {
    color: 'red',
    faces: [
      { value: 'star', damage: 4 },
      { value: 5, damage: 4 },
      { value: 4, damage: 4 },
      { value: 3, damage: 4 },
      { value: 2, damage: 4 },
      { value: 'blank', damage: 0 },
    ],
  },
  pink: {
    color: 'pink',
    ignoresShields: true,
    ignoresComputers: true,
    faces: [
      { value: 'star', damage: 1, selfDamage: 0 },
      { value: 'star', damage: 2, selfDamage: 0 },
      { value: 'star', damage: 3, selfDamage: 1 },
      { value: 'star', damage: 0, selfDamage: 1 },
      { value: 'blank', damage: 0, selfDamage: 0 },
      { value: 'blank', damage: 0, selfDamage: 0 },
    ],
  },
};
