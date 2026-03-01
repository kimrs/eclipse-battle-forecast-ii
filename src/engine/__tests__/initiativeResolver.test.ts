import { describe, it, expect } from 'vitest';
import { resolveInitiativeOrder } from '../initiativeResolver';
import type { Blueprint, ShipType } from '../../types/game';

function makeBlueprint(shipType: ShipType, initiativeBonus: number, partInitiative = 0): Blueprint {
  return {
    shipType,
    initiativeBonus,
    slots: 4,
    parts: partInitiative === 0 ? [] : [
      {
        id: 'test-part',
        name: 'Test Part',
        cannons: [],
        missiles: [],
        computers: 0,
        shields: 0,
        hull: 0,
        initiative: partInitiative,
        energyProduction: 0,
        energyConsumption: 0,
      },
    ],
  };
}

describe('resolveInitiativeOrder', () => {
  it('returns entries sorted by initiative descending', () => {
    const attackerBlueprints = {
      interceptor: makeBlueprint('interceptor', 2),
      cruiser: makeBlueprint('cruiser', 1),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };
    const defenderBlueprints = {
      interceptor: makeBlueprint('interceptor', 3),
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };

    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerBlueprints,
      defenderBlueprints,
      ['interceptor', 'cruiser'],
      ['interceptor'],
    );

    expect(result).toHaveLength(3);
    // defender interceptor (3) > attacker interceptor (2) > attacker cruiser (1)
    expect(result[0]).toMatchObject({ factionId: 'defender', shipType: 'interceptor', initiative: 3 });
    expect(result[1]).toMatchObject({ factionId: 'attacker', shipType: 'interceptor', initiative: 2 });
    expect(result[2]).toMatchObject({ factionId: 'attacker', shipType: 'cruiser', initiative: 1 });
  });

  it('includes part initiative in calculation', () => {
    const attackerBlueprints = {
      interceptor: makeBlueprint('interceptor', 1, 2), // total 3
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };
    const defenderBlueprints = {
      interceptor: makeBlueprint('interceptor', 2),    // total 2
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };

    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerBlueprints,
      defenderBlueprints,
      ['interceptor'],
      ['interceptor'],
    );

    expect(result[0]).toMatchObject({ factionId: 'attacker', initiative: 3 });
    expect(result[1]).toMatchObject({ factionId: 'defender', initiative: 2 });
  });

  it('tie-breaking favors Defender (Defender fires first on equal initiative)', () => {
    const attackerBlueprints = {
      interceptor: makeBlueprint('interceptor', 2),
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };
    const defenderBlueprints = {
      interceptor: makeBlueprint('interceptor', 2),
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };

    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerBlueprints,
      defenderBlueprints,
      ['interceptor'],
      ['interceptor'],
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ factionId: 'defender', isDefender: true });
    expect(result[1]).toMatchObject({ factionId: 'attacker', isDefender: false });
  });

  it('only includes ship types actually present in battle', () => {
    const attackerBlueprints = {
      interceptor: makeBlueprint('interceptor', 3),
      cruiser: makeBlueprint('cruiser', 2),
      dreadnought: makeBlueprint('dreadnought', 1),
      starbase: makeBlueprint('starbase', 0),
    };
    const defenderBlueprints = {
      interceptor: makeBlueprint('interceptor', 0),
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 4),
      starbase: makeBlueprint('starbase', 0),
    };

    // Attacker only has interceptors, defender only has dreadnoughts
    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerBlueprints,
      defenderBlueprints,
      ['interceptor'],
      ['dreadnought'],
    );

    expect(result).toHaveLength(2);
    const shipTypes = result.map(e => e.shipType);
    expect(shipTypes).not.toContain('cruiser');
    expect(shipTypes).not.toContain('starbase');
    expect(result[0]).toMatchObject({ factionId: 'defender', shipType: 'dreadnought', initiative: 4 });
    expect(result[1]).toMatchObject({ factionId: 'attacker', shipType: 'interceptor', initiative: 3 });
  });

  it('isDefender flag is set correctly', () => {
    const bp = {
      interceptor: makeBlueprint('interceptor', 1),
      cruiser: makeBlueprint('cruiser', 0),
      dreadnought: makeBlueprint('dreadnought', 0),
      starbase: makeBlueprint('starbase', 0),
    };

    const result = resolveInitiativeOrder('a', 'b', bp, bp, ['interceptor'], ['interceptor']);

    const defender = result.find(e => e.factionId === 'b');
    const attacker = result.find(e => e.factionId === 'a');
    expect(defender?.isDefender).toBe(true);
    expect(attacker?.isDefender).toBe(false);
  });
});
