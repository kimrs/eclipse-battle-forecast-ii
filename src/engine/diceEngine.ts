import type { DieFace, DieColor, DieDefinition } from '../types/game';
import { DICE } from '../data/dice';

export interface DicePool {
  roll(): DieFace;
  reset(): void;
  readonly color: DieColor;
  readonly poolSize: number;
}

export interface DiceEngine {
  roll(color: DieColor): DieFace;
  rollMultiple(color: DieColor, count: number): DieFace[];
  reset(): void;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generatePool(die: DieDefinition, poolSize: number): DieFace[] {
  if (poolSize === 0) throw new Error('Pool size must be greater than 0');
  if (poolSize % 6 !== 0) throw new Error('Pool size must be divisible by 6');
  const repeats = poolSize / 6;
  const pool: DieFace[] = [];
  for (const face of die.faces) {
    for (let i = 0; i < repeats; i++) {
      pool.push(face);
    }
  }
  return shuffle(pool);
}

export function createDicePool(die: DieDefinition, poolSize: number): DicePool {
  if (poolSize === 0) throw new Error('Pool size must be greater than 0');
  if (poolSize % 6 !== 0) throw new Error('Pool size must be divisible by 6');

  let pool = generatePool(die, poolSize);
  let index = 0;

  return {
    get color() { return die.color; },
    get poolSize() { return poolSize; },
    roll(): DieFace {
      if (index >= poolSize) {
        pool = generatePool(die, poolSize);
        index = 0;
      }
      return pool[index++];
    },
    reset() {
      pool = generatePool(die, poolSize);
      index = 0;
    },
  };
}

export function createDiceEngine(poolSize = 600): DiceEngine {
  const pools = new Map<DieColor, DicePool>();
  for (const [color, die] of Object.entries(DICE) as [DieColor, DieDefinition][]) {
    pools.set(color, createDicePool(die, poolSize));
  }

  return {
    roll(color: DieColor): DieFace {
      const pool = pools.get(color);
      if (!pool) throw new Error(`Unknown die color: ${color}`);
      return pool.roll();
    },
    rollMultiple(color: DieColor, count: number): DieFace[] {
      return Array.from({ length: count }, () => this.roll(color));
    },
    reset() {
      for (const pool of pools.values()) {
        pool.reset();
      }
    },
  };
}

export function createDeterministicPool(faces: DieFace[]): DicePool {
  let index = 0;
  return {
    get color(): DieColor { return 'yellow'; },
    get poolSize() { return faces.length; },
    roll(): DieFace {
      const face = faces[index % faces.length];
      index++;
      return face;
    },
    reset() {
      index = 0;
    },
  };
}
