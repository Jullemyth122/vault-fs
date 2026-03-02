# VaultFS — Deterministic Vault Explorer

> A password-driven file system explorer that transforms SHA-256 hashes into persistent, navigable tree structures.

---

## What is VaultFS?

VaultFS is a procedural file system generator with a full explorer UI. You enter a password — it gets SHA-256 hashed, and that hash deterministically seeds an entire folder/file hierarchy. The same password always produces the same vault: same structure, same names, same metadata. No randomness, no drift.

The vault is then fully interactive — you can browse, create, rename, move, and delete nodes — and all changes are persisted to `localStorage`, keyed by hash.

---

## Features

| Feature | Description |
|---|---|
| 🔐 **Hash-Seeded Generation** | SHA-256 password hash → deterministic tree via a custom seeded RNG |
| 🌲 **N-ary & Trinary Modes** | Switch between unlimited branching or max-3-children constraint per vault |
| 🗂️ **Interactive Explorer** | Click to navigate, right-click context menu, back/forward history |
| ✏️ **FS Mutations** | Create folders & files, rename, move, delete — all persisted |
| 💾 **localStorage Persistence** | Each vault saved under its hash key; survives page refresh |
| 🎨 **Node Coloring** | Folder color metadata set via context menu color picker |
| 🔒 **Lock Screen** | Vault-unlock flow with animated lock screen |

---

## Tech Stack

- **React 19** — UI layer with `useReducer` for centralized state
- **TypeScript** — Strict throughout, including exhaustive action type guards
- **Vite + SWC** — Fast dev server and build
- **Sass (SCSS Modules)** — Component-scoped styles with a unified design token system
- **Lucide React** — Icon set
- **GSAP** — Animations on the lock screen

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Type-check + production build
npm run build

# Lint
npm run lint
```

### Verify Core Logic

Run the Phase 1 test suite (tree generation, traversal, seeded RNG) without a browser:

```bash
npx tsx src/core/phase1.test.ts
```

---

## Project Structure

```
src/
├── core/                   # Pure logic — no React, no side effects
│   ├── tree.ts             # Immutable TreeNode type + all tree operations
│   ├── treeGenerator.ts    # Hash → full tree (deterministic)
│   ├── treeTraversal.ts    # DFS / BFS algorithms
│   ├── seedRandom.ts       # Custom seeded RNG (deterministic pseudo-random)
│   ├── hashPassword.ts     # SHA-256 via Web Crypto API
│   └── phase1.test.ts      # Core logic unit tests (no test runner needed)
│
├── store/
│   ├── vaultReducer.ts     # Single reducer: ALL state transitions live here
│   └── useVaultStore.tsx   # React context + useReducer wiring
│
├── hooks/
│   ├── useFileSystem.tsx   # FS mutations + navigation (dispatches to reducer)
│   ├── usePasswordVault.tsx# Hash → vault unlock / create flow
│   └── useTreeMode.tsx     # N-ary / Trinary toggle with violation checks
│
├── components/
│   ├── explorer/           # Main UI: Explorer, TreePanel, TreeNode, ContentPanel, Breadcrumb
│   ├── toolbar/            # Toolbar, TreeModeToggle
│   ├── shared/             # ContextMenu, Modal
│   └── vault/              # LockScreen, VaultBadge
│
├── styles/                 # SCSS modules + design tokens
│   ├── token.scss          # Single source of truth for all visual values
│   ├── global.scss         # Resets, typography, animations, utility classes
│   └── *.module.scss       # Per-component scoped styles
│
└── utils/
    ├── localStorage.tsx    # Typed localStorage persistence layer
    └── fileIcons.tsx       # Extension → icon/color mapping
```

---

## Architecture Notes

### State Management — Reducer Pattern

All application state lives in a single `VaultState` object managed by `vaultReducer`. Components never mutate state directly — they dispatch typed actions:

```
VAULT_UNLOCK | VAULT_LOCK | VAULT_UPDATE_TREE | VAULT_CHANGE_MODE
NODE_SELECT  | NODE_FOCUS | NAV_BACK | NAV_FORWARD
FS_INSERT_CHILD | FS_REMOVE | FS_RENAME | FS_MOVE | FS_UPDATE_META
SET_LOADING  | SET_ERROR
```

This is the same pattern as Redux, implemented with `useReducer` — simple for a medium-scale project without the overhead of an external library.

### Deterministic Generation

The vault ID (a short hex string) is derived from the first 8 characters of the SHA-256 hash. The full hash is used to seed a custom linear-congruential RNG that drives all procedural decisions: tree depth, branching factor, node names, file extensions, folder colors. Same hash → same everything.

### Persistence

Each vault is stored in `localStorage` under its own key (`vaultfs:vault:<hash>`). A separate index key (`vaultfs:index`) tracks all known hashes. This allows listing all vaults without iterating all localStorage keys.

---

## Design System

All visual values (colors, spacing, typography, radii, shadows, transitions) are defined once in `src/styles/token.scss` and exposed as both SCSS variables and CSS custom properties on `:root`. No hardcoded values elsewhere.

The color palette is a deep violet-dark theme (`--bg-void: #04040a` → `--accent-light: #a78bfa`).
