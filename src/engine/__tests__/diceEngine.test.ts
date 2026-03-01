import { describe, it, expect } from 'vitest';
import type { DieFace } from '../../types/game';
import {
  generatePool,
  createDicePool,
  createDiceEngine,
  createDeterministicPool,
} from '../diceEngine';
import { DICE } from '../../data/dice';

// Helper: build a simple 6-face test die definition
const testDie = DICE.yellow;

describe('generatePool', () => {
  it('throws if pool size is 0', () => {
    expect(() => generatePool(testDie, 0)).toThrow();
  });

  it('throws if pool size is not divisible by 6', () => {
    expect(() => generatePool(testDie, 7)).toThrow();
    expect(() => generatePool(testDie, 100)).toThrow();
  });

  it('each face appears exactly poolSize/6 times', () => {
    const pool = generatePool(testDie, 600);
    expect(pool).toHaveLength(600);
    const counts = new Map<string, number>();
    for (const face of pool) {
      const key = JSON.stringify(face);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(100);
    }
  });
});

describe('createDicePool', () => {
  it('throws if pool size is 0', () => {
    expect(() => createDicePool(testDie, 0)).toThrow();
  });

  it('throws if pool size is not divisible by 6', () => {
    expect(() => createDicePool(testDie, 13)).toThrow();
  });

  it('uniform distribution: 600 rolls, each face exactly 100 times', () => {
    const pool = createDicePool(testDie, 600);
    const counts = new Map<string, number>();
    for (let i = 0; i < 600; i++) {
      const face = pool.roll();
      const key = JSON.stringify(face);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(100);
    }
  });

  it('reshuffles on exhaustion and stays uniform', () => {
    const pool = createDicePool(testDie, 600);
    // Exhaust first cycle
    for (let i = 0; i < 600; i++) pool.roll();
    // Second cycle also uniform
    const counts = new Map<string, number>();
    for (let i = 0; i < 600; i++) {
      const face = pool.roll();
      const key = JSON.stringify(face);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(100);
    }
  });

  it('pool size 6: each face appears exactly once per cycle', () => {
    const pool = createDicePool(testDie, 6);
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const face = pool.roll();
      seen.add(JSON.stringify(face));
    }
    expect(seen.size).toBe(6);
  });

  it('exposes correct color and poolSize', () => {
    const pool = createDicePool(testDie, 60);
    expect(pool.color).toBe('yellow');
    expect(pool.poolSize).toBe(60);
  });

  it('reset reshuffles and returns to start', () => {
    const pool = createDicePool(testDie, 6);
    const firstCycle: DieFace[] = [];
    for (let i = 0; i < 6; i++) firstCycle.push(pool.roll());
    pool.reset();
    // After reset, another 6 rolls should again cover all faces
    const counts = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const face = pool.roll();
      counts.set(JSON.stringify(face), (counts.get(JSON.stringify(face)) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
  });
});

describe('createDiceEngine - independence between color pools', () => {
  it('rolling one color does not affect another', () => {
    const engine = createDiceEngine(600);
    // Roll 300 yellow dice
    for (let i = 0; i < 300; i++) engine.roll('yellow');
    // Blue pool should still be at its own position; 600 blue rolls should be uniform
    const counts = new Map<string, number>();
    for (let i = 0; i < 600; i++) {
      const face = engine.roll('blue');
      const key = JSON.stringify(face);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(100);
    }
  });

  it('rollMultiple returns correct count', () => {
    const engine = createDiceEngine(600);
    const rolls = engine.rollMultiple('orange', 10);
    expect(rolls).toHaveLength(10);
  });

  it('reset resets all color pools', () => {
    const engine = createDiceEngine(600);
    // Exhaust a pool
    for (let i = 0; i < 600; i++) engine.roll('red');
    engine.reset();
    // After reset, 600 red rolls should be uniform
    const counts = new Map<string, number>();
    for (let i = 0; i < 600; i++) {
      const face = engine.roll('red');
      const key = JSON.stringify(face);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(100);
    }
  });
});

describe('createDeterministicPool', () => {
  it('returns faces in exact order provided', () => {
    const faces: DieFace[] = [
      { value: 'star', damage: 1 },
      { value: 'blank', damage: 0 },
      { value: 3, damage: 1 },
    ];
    const pool = createDeterministicPool(faces);
    expect(pool.roll()).toEqual(faces[0]);
    expect(pool.roll()).toEqual(faces[1]);
    expect(pool.roll()).toEqual(faces[2]);
  });

  it('wraps around at end', () => {
    const faces: DieFace[] = [
      { value: 'star', damage: 2 },
      { value: 'blank', damage: 0 },
    ];
    const pool = createDeterministicPool(faces);
    pool.roll(); // index 0
    pool.roll(); // index 1
    expect(pool.roll()).toEqual(faces[0]); // wraps back to 0
  });

  it('reset returns to position 0', () => {
    const faces: DieFace[] = [
      { value: 4, damage: 1 },
      { value: 'blank', damage: 0 },
    ];
    const pool = createDeterministicPool(faces);
    pool.roll();
    pool.reset();
    expect(pool.roll()).toEqual(faces[0]);
  });
});
