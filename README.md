# SideProject Tree: Deterministic Vault Generator

A unique file system generator that transforms password hashes into persistent, navigable tree structures.

## Overview

SideProject Tree uses procedural generation to build deterministic folder and file hierarchies based on SHA-256 hashes. Whether using N-ary branching (unlimited growth) or Trinary constraints (max 3 children), the same input hash always yields the exact same structure, metadata, and node IDs.

### Key Features
- **Deterministic Generation**: Same password = Same vault.
- **Structural Modes**: Supports both standard N-ary and restricted Trinary tree layouts.
- **Seeded Randomness**: Procedural naming and metadata (colors, extensions) are stable across sessions.
- **Immutable Core**: Pure functional approach to tree mutations ensures thread-safe state management.
- **Modern Stack**: Built with React 19, Vite, TypeScript, Sass, and GSAP for fluid animations.

## Getting Started

### Development
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Core Logic Verification
To verify the tree generation and traversal logic:
```bash
npx tsx src/core/phase1.test.ts
```

## Core Architecture
- `src/core/tree.ts`: Immutable tree data structure and node operations.
- `src/core/treeGenerator.ts`: Master logic for hash-to-tree transformation.
- `src/core/seedRandom.ts`: Custom seeded RNG streams for deterministic procedural content.
- `src/core/treeTraversal.ts`: Depth-first and Breadth-first search algorithms.
