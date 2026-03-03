import { describe, it, expect } from 'vitest';
import { resolveInitiativeOrder } from '../initiativeResolver';
import type { ShipType } from '../../types/game';

function makeInitiatives(values: Partial<Record<ShipType, number>>): Record<ShipType, number> {
  return {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
    ...values,
  };
}

describe('resolveInitiativeOrder', () => {
  it('returns entries sorted by initiative descending', () => {
    const attackerInit = makeInitiatives({ interceptor: 2, cruiser: 1 });
    const defenderInit = makeInitiatives({ interceptor: 3 });

    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerInit,
      defenderInit,
      ['interceptor', 'cruiser'],
      ['interceptor'],
    );

    expect(result).toHaveLength(3);
    // defender interceptor (3) > attacker interceptor (2) > attacker cruiser (1)
    expect(result[0]).toMatchObject({ factionId: 'defender', shipType: 'interceptor', initiative: 3 });
    expect(result[1]).toMatchObject({ factionId: 'attacker', shipType: 'interceptor', initiative: 2 });
    expect(result[2]).toMatchObject({ factionId: 'attacker', shipType: 'cruiser', initiative: 1 });
  });

  it('pre-computed initiative values are used directly', () => {
    const attackerInit = makeInitiatives({ interceptor: 3 }); // total 3 (e.g. bonus 1 + parts 2)
    const defenderInit = makeInitiatives({ interceptor: 2 }); // total 2

    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerInit,
      defenderInit,
      ['interceptor'],
      ['interceptor'],
    );

    expect(result[0]).toMatchObject({ factionId: 'attacker', initiative: 3 });
    expect(result[1]).toMatchObject({ factionId: 'defender', initiative: 2 });
  });

  it('tie-breaking favors Defender (Defender fires first on equal initiative)', () => {
    const init = makeInitiatives({ interceptor: 2 });

    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      init,
      init,
      ['interceptor'],
      ['interceptor'],
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ factionId: 'defender', isDefender: true });
    expect(result[1]).toMatchObject({ factionId: 'attacker', isDefender: false });
  });

  it('only includes ship types actually present in battle', () => {
    const attackerInit = makeInitiatives({ interceptor: 3, cruiser: 2, dreadnought: 1 });
    const defenderInit = makeInitiatives({ dreadnought: 4 });

    // Attacker only has interceptors, defender only has dreadnoughts
    const result = resolveInitiativeOrder(
      'attacker',
      'defender',
      attackerInit,
      defenderInit,
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
    const init = makeInitiatives({ interceptor: 1 });

    const result = resolveInitiativeOrder('a', 'b', init, init, ['interceptor'], ['interceptor']);

    const defender = result.find(e => e.factionId === 'b');
    const attacker = result.find(e => e.factionId === 'a');
    expect(defender?.isDefender).toBe(true);
    expect(attacker?.isDefender).toBe(false);
  });
});
