import type { ShipType } from '../types/game';

export interface InitiativeEntry {
  factionId: string;
  shipType: ShipType;
  initiative: number;
  isDefender: boolean;
}

export function resolveInitiativeOrder(
  attackerFactionId: string,
  defenderFactionId: string,
  attackerInitiatives: Record<ShipType, number>,
  defenderInitiatives: Record<ShipType, number>,
  attackerShipTypes: ShipType[],
  defenderShipTypes: ShipType[],
): InitiativeEntry[] {
  const entries: InitiativeEntry[] = [];

  for (const shipType of attackerShipTypes) {
    entries.push({
      factionId: attackerFactionId,
      shipType,
      initiative: attackerInitiatives[shipType],
      isDefender: false,
    });
  }

  for (const shipType of defenderShipTypes) {
    entries.push({
      factionId: defenderFactionId,
      shipType,
      initiative: defenderInitiatives[shipType],
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
