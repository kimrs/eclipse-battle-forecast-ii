# Dice Engine — Eclipse Combat Forecast II

## File: `src/engine/diceEngine.ts`

## Purpose

Provide a uniform dice rolling system that guarantees statistical fairness over a configured number of throws. Instead of using `Math.random()` per roll, the engine pre-generates a shuffled pool of results where each face appears an equal number of times.

## Core Concept

For a die with 6 faces and a pool size of N (default 600, must be divisible by 6):
- Each face appears exactly `N / 6` times in the pool
- The pool is shuffled (Fisher-Yates) at creation
- Rolls draw sequentially from the pool
- When the pool is exhausted, it is reshuffled and restarted

This ensures that over any window of N rolls, the distribution is perfectly uniform.

## API

```typescript
interface DicePool {
  roll(): DieFace;         // draw the next face from the pool
  reset(): void;           // reshuffle and restart from position 0
  readonly color: DieColor;
  readonly poolSize: number;
}

function createDicePool(die: DieDefinition, poolSize: number): DicePool;

interface DiceEngine {
  roll(color: DieColor): DieFace;
  rollMultiple(color: DieColor, count: number): DieFace[];
  reset(): void;
}

function createDiceEngine(poolSize?: number): DiceEngine;
// Default poolSize = 600
// Creates one DicePool per color (yellow, orange, blue, red, pink) using DICE definitions from data/dice.ts
```

## Implementation Details

### Pool Generation

```
function generatePool(die: DieDefinition, poolSize: number): DieFace[] {
  // poolSize must be divisible by 6
  const repeats = poolSize / 6;
  const pool: DieFace[] = [];
  for (const face of die.faces) {
    for (let i = 0; i < repeats; i++) {
      pool.push(face);
    }
  }
  return shuffle(pool);
}
```

### Fisher-Yates Shuffle

```
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Pool Consumption

- Maintain an internal index starting at 0
- Each `roll()` returns `pool[index++]`
- When `index >= poolSize`, reshuffle and reset index to 0
- Each color has its own independent pool

## Testing Requirements

### Uniform Distribution Test
- Create a pool of size 600 for a test die
- Consume all 600 rolls
- Verify each face appeared exactly 100 times
- Verify that after exhaustion and reshuffle, another 600 rolls also produce exact uniformity

### Independence Test
- Rolling from one color's pool does not affect another color's pool
- Each color pool tracks its own index

### Edge Cases
- Pool size not divisible by 6 → throw error at creation time
- Pool size of 6 → each face appears exactly once per cycle
- Pool size of 0 → throw error

## Usage in Combat Engine

The combat engine creates a single `DiceEngine` instance per simulation run (or per battle pair — TBD based on performance). The engine is passed into combat functions rather than being a global singleton, enabling deterministic testing by controlling the pool contents.

## Deterministic Testing Support

For unit tests, allow injecting a pre-built pool (no shuffle) so results are predictable:

```typescript
function createDeterministicPool(faces: DieFace[]): DicePool;
// Returns faces in exact order provided, wraps around at end
```
