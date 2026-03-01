import type { ShipType } from '../types/game';
import speciesData from './species.json';

export interface BlueprintPreset {
  initiativeBonus: number;
  slots: number;
  defaultParts: string[];
  innateComputers?: number;
  innateShields?: number;
  innateHull?: number;
  innateInitiative?: number;
  innateEnergyProduction?: number;
}

export interface SpeciesPreset {
  id: string;
  name: string;
  blueprints: Record<ShipType, BlueprintPreset>;
}

export const SPECIES_PRESETS: SpeciesPreset[] = speciesData as SpeciesPreset[];
