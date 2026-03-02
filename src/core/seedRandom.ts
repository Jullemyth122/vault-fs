/**
 * core/seedRandom.ts
 *
 * A seeded pseudo-random number generator (PRNG).
 *
 * WHY DO WE NEED THIS?
 *   JavaScript's Math.random() is unseeded — it gives a different result
 *   every time you call it. That's fine for most uses, but our project
 *   needs DETERMINISM: the same password must always produce the exact
 *   same folder tree. So we use a PRNG that starts from a fixed seed.
 *
 * ALGORITHM: Mulberry32
 *   A fast, high-quality 32-bit PRNG. Simple enough to understand,
 *   good enough for games and procedural generation.
 *   Source: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 *
 * LEARNING: This is how game world generation works too — Minecraft uses
 * a seed to generate the same world every time from the same number.
 *
 * HOW IT WORKS:
 *   1. Start with a numeric seed (we'll derive this from the password hash)
 *   2. Each call to next() scrambles the internal state with bit operations
 *   3. The result is a float between 0 and 1, just like Math.random()
 *   4. Crucially: same seed → same sequence of numbers, always
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * SeededRandom
 * The object returned by createSeededRandom().
 * Holds the internal mutable state and exposes helper methods.
 */
export interface SeededRandom {
  /** Returns a float in [0, 1) — like Math.random() but deterministic */
  next: () => number;

  /** Returns an integer in [min, max] inclusive */
  nextInt: (min: number, max: number) => number;

  /** Returns a random item from an array */
  pick: <T>(arr: T[]) => T;

  /** Returns a shuffled COPY of an array (original untouched) */
  shuffle: <T>(arr: T[]) => T[];

  /** Returns true with the given probability (0.0 – 1.0) */
  chance: (probability: number) => boolean;

  /** Returns the current internal seed state (useful for debugging) */
  getSeed: () => number;
}

// ─── Core PRNG ────────────────────────────────────────────────────────────────

/**
 * mulberry32
 * The raw PRNG function. Takes a seed, returns a function that
 * produces the next number in the sequence each time it's called.
 *
 * The bit operations (|0, >>>, ^, *) are standard integer scrambling
 * techniques. You don't need to understand them deeply — just know
 * that they produce well-distributed pseudo-random numbers.
 */
function mulberry32(seed: number): () => number {
  // `state` is mutated on every call — this is the "current position"
  // in the infinite sequence of pseudo-random numbers
  let state = seed >>> 0; // force to unsigned 32-bit integer

  return function (): number {
    // Mulberry32 core — each step updates state
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;

    let z = Math.imul(state ^ (state >>> 15), 1 | state);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;

    // Normalize to [0, 1) by dividing by max uint32
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * createSeededRandom
 * The main export. Takes a numeric seed and returns a SeededRandom object.
 *
 * Usage:
 *   const rng = createSeededRandom(12345);
 *   rng.next()         // → 0.7341...
 *   rng.nextInt(1, 10) // → 7
 *   rng.pick(["a","b","c"]) // → "b"
 */
export function createSeededRandom(seed: number): SeededRandom {
  const raw = mulberry32(seed);

  const next = (): number => raw();

  const nextInt = (min: number, max: number): number => {
    // Math.floor(random * range) maps [0,1) → [min, max]
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(arr: T[]): T => {
    if (arr.length === 0) throw new Error("pick: empty array");
    return arr[nextInt(0, arr.length - 1)];
  };

  /**
   * Fisher-Yates shuffle — the standard algorithm for random permutations.
   * Goes from the end of the array backwards, swapping each element
   * with a randomly chosen element at or before it.
   */
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr]; // don't mutate the original
    for (let i = copy.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      // Swap positions i and j
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const chance = (probability: number): boolean => next() < probability;

  const getSeed = (): number => seed;

  return { next, nextInt, pick, shuffle, chance, getSeed };
}

// ─── Seed Derivation ──────────────────────────────────────────────────────────

/**
 * hashStringToSeed
 * Converts a hex string (like a SHA-256 hash) into a 32-bit integer seed.
 *
 * WHY: The PRNG needs a number, but our password hash is a hex string like
 *   "a3f9c2..." We take the first 8 hex characters and parse as base-16.
 *
 * This is a lossy but sufficient conversion — we only need enough bits
 * to create a unique-enough seed per password.
 *
 * "a3f9c2b1" → parseInt("a3f9c2b1", 16) → 2752889521
 */
export function hashStringToSeed(hexHash: string): number {
    // Take first 8 hex chars = 32 bits = one uint32
    const chunk = hexHash.slice(0, 8);
    const seed = parseInt(chunk, 16);

    if (isNaN(seed)) {
        throw new Error(`hashStringToSeed: invalid hex string "${hexHash}"`);
    }

    return seed;
}

/**
 * makeSeededIdFactory
 * Returns a function that generates deterministic, unique-enough IDs
 * from the seeded RNG. Used by treeGenerator so the same hash always
 * produces nodes with the same IDs.
 *
 * Format: "gen-<8 hex chars>" e.g. "gen-a3f9c2b1"
 *
 * WHY NOT USE crypto.randomUUID() IN THE GENERATOR?
 *   UUID is random every call — same hash would produce different node IDs
 *   each run, breaking determinism. This factory uses the seeded RNG so
 *   IDs are always the same for the same password.
 *
 * Real user-created nodes (Phase 2+) still use crypto.randomUUID().
 */
export function makeSeededIdFactory(rng: SeededRandom): () => string {
    return () => {
        const a = rng.nextInt(0, 0xffff).toString(16).padStart(4, "0");
        const b = rng.nextInt(0, 0xffff).toString(16).padStart(4, "0");
        return `gen-${a}${b}`;
    };
}

/**
 * hashStringToSeeds
 * Returns multiple independent seeds from different parts of the hash.
 * Useful if you need multiple independent RNG streams (e.g. one for
 * folder names, one for file names, one for tree structure).
 *
 * A SHA-256 hash is 64 hex chars = 8 chunks of 8 chars = 8 possible seeds.
 */
export function hashStringToSeeds(hexHash: string, count: number): number[] {
    if (count > 8) throw new Error("hashStringToSeeds: max 8 seeds from SHA-256");

    return Array.from({ length: count }, (_, i) => {
        const chunk = hexHash.slice(i * 8, i * 8 + 8);
        const seed = parseInt(chunk, 16);
        return isNaN(seed) ? i * 31337 : seed; // fallback if chunk is invalid
    });
}