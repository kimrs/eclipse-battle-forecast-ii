import type { ShipType, DieColor, ShipPart } from '../types/game';
import { SHIP_PARTS } from './shipParts';

export const SHIP_TYPES: ShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];

export const SHIP_TYPE_MAX: Record<ShipType, number> = {
  interceptor: 8,
  cruiser: 4,
  dreadnought: 2,
  starbase: 4,
};

export const SHIP_TYPE_LABELS: Record<ShipType, { singular: string; plural: string; abbreviated: string }> = {
  interceptor: { singular: 'Interceptor', plural: 'Interceptors', abbreviated: 'Int' },
  cruiser: { singular: 'Cruiser', plural: 'Cruisers', abbreviated: 'Cru' },
  dreadnought: { singular: 'Dreadnought', plural: 'Dreadnoughts', abbreviated: 'Drd' },
  starbase: { singular: 'Starbase', plural: 'Starbases', abbreviated: 'SB' },
};

export const DIE_COLOR_CLASSES: Record<DieColor, string> = {
  yellow: 'bg-yellow-400 text-yellow-900',
  orange: 'bg-orange-400 text-orange-900',
  blue: 'bg-blue-500 text-white',
  red: 'bg-red-500 text-white',
  pink: 'bg-pink-400 text-pink-900',
};

export const FACTION_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const PART_BY_ID: Record<string, ShipPart> = Object.fromEntries(
  SHIP_PARTS.map(p => [p.id, p])
);
