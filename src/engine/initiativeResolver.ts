import type { Blueprint, ShipType } from '../types/game';

export interface InitiativeEntry {
  factionId: string;
  shipType: ShipType;
  initiative: number;
  isDefender: boolean;
}

function computeInitiative(blueprint: Blueprint): number {
  return blueprint.initiativeBonus + blueprint.parts.reduce((sum, p) => sum + p.initiative, 0);
}

export function resolveInitiativeOrder(
  attackerFactionId: string,
  defenderFactionId: string,
  attackerBlueprints: Record<ShipType, Blueprint>,
  defenderBlueprints: Record<ShipType, Blueprint>,
  attackerShipTypes: ShipType[],
  defenderShipTypes: ShipType[],
): InitiativeEntry[] {
  const entries: InitiativeEntry[] = [];

  for (const shipType of attackerShipTypes) {
    entries.push({
      factionId: attackerFactionId,
      shipType,
      initiative: computeInitiative(attackerBlueprints[shipType]),
      isDefender: false,
    });
  }

  for (const shipType of defenderShipTypes) {
    entries.push({
      factionId: defenderFactionId,
      shipType,
      initiative: computeInitiative(defenderBlueprints[shipType]),
      isDefender: true,
    });
  }

  // Sort descending by initiative; ties: Defender fires first (isDefender = true comes first)
  entries.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    // Tie-breaking: defender fires first
    if (a.isDefender && !b.isDefender) return -1;
    if (!a.isDefender && b.isDefender) return 1;
    return 0;
  });

  return entries;
}
