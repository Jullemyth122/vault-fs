/**
 * core/treeGenerator.ts
 *
 * The most unique part of this project.
 * Takes a password hash → produces a deterministic N-ary or Trinary tree.
 *
 * SAME HASH = SAME TREE. Always.
 * DIFFERENT HASH = COMPLETELY DIFFERENT TREE.
 *
 * HOW IT WORKS:
 *   1. Derive multiple seeds from the hash (one per RNG concern)
 *   2. Use the seeded RNG to decide: how many children? what names? what types?
 *   3. Recursively build the tree level by level
 *
 * LEARNING CONCEPTS HERE:
 *   - Procedural generation (same technique used in Minecraft, No Man's Sky)
 *   - Recursive tree building
 *   - Controlling complexity with depth limits and probability curves
 */

import { type TreeNode, type TreeMode, TRINARY_MAX_CHILDREN } from "./tree";
import { createSeededRandom, hashStringToSeeds, makeSeededIdFactory } from "./seedRandom";

// ─── Generator Config ─────────────────────────────────────────────────────────

/**
 * GeneratorConfig
 * Controls the shape and size of the generated tree.
 * You can tune these to get different "feels" for your vault.
 */
export interface GeneratorConfig {
  /** How deep the tree can go. 0 = root only. */
  maxDepth: number;

  /**
   * Probability (0.0–1.0) that a folder node at each depth will
   * actually have children. Decreases as depth increases to
   * avoid infinitely deep trees.
   */
  branchProbabilityByDepth: number[];

  /**
   * Max children per node in N-ary mode.
   * In Trinary mode, this is always capped at TRINARY_MAX_CHILDREN (3).
   */
  maxChildrenNary: number;

  /** Min children when a node decides to branch */
  minChildren: number;

  /** Probability that a leaf node is a FILE vs an empty FOLDER */
  fileProbability: number;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  maxDepth: 4,
  // Probability of branching at each depth level
  // Depth 0 (root): always branches
  // Depth 1: 90% chance
  // Depth 2: 70% chance
  // Depth 3: 40% chance
  // Depth 4+: 15% chance (but we cap at maxDepth anyway)
  branchProbabilityByDepth: [1.0, 0.9, 0.7, 0.4, 0.15],
  maxChildrenNary: 5,
  minChildren: 1,
  fileProbability: 0.45,
};

// ─── Name Banks ───────────────────────────────────────────────────────────────
// The names a generated tree can use for its nodes.
// Deliberately varied to feel like a real filesystem.

const FOLDER_NAMES = [
  "documents", "projects", "archive", "media", "config",
  "logs", "cache", "temp", "backup", "notes",
  "personal", "work", "shared", "downloads", "uploads",
  "src", "assets", "data", "reports", "drafts",
  "private", "public", "secrets", "vault", "records",
  "2023", "2024", "old", "new", "misc",
];

const FILE_NAMES = [
  "readme", "notes", "todo", "index", "main",
  "config", "backup", "report", "summary", "draft",
  "log", "data", "export", "import", "manifest",
  "profile", "settings", "history", "journal", "memo",
];

const FILE_EXTENSIONS = [
  ".txt", ".md", ".pdf", ".json", ".csv",
  ".log", ".xml", ".yaml", ".doc", ".xlsx",
];

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * generateTreeFromHash
 * The main export. Takes a hex hash string and builds a full tree.
 *
 * We use THREE separate RNG streams (derived from different parts of the hash):
 *   - structureRng: decides the SHAPE of the tree (how many children, file vs folder)
 *   - nameRng:      picks NAMES for nodes
 *   - metaRng:      assigns METADATA (colors, ordering)
 *
 * Using separate RNGs means changing the naming strategy won't affect
 * the tree structure, and vice versa.
 */
export function generateTreeFromHash(
    hexHash: string,
    mode: TreeMode,
    config: GeneratorConfig = DEFAULT_CONFIG
): TreeNode {
    // Derive 3 independent seeds from different 8-char chunks of the hash
    const [structureSeed, nameSeed, metaSeed, idSeed] = hashStringToSeeds(hexHash, 4);

    const structureRng = createSeededRandom(structureSeed);
    const nameRng = createSeededRandom(nameSeed);
    const metaRng = createSeededRandom(metaSeed);

    // ID factory: produces deterministic IDs for every generated node
    // This is the key to determinism — same hash → same IDs, always
    const makeId = makeSeededIdFactory(createSeededRandom(idSeed));

    // A set of used folder names at each depth level, to avoid duplicates
    const usedNames = new Set<string>();

    // const root = createRootNode("root");
    // Root node uses a fixed, hash-derived ID so it's always the same
    const root: TreeNode = {
        id: makeId(),
        name: "root",
        type: "folder",
        extension: null,
        children: [],
        createdAt: 0, // fixed timestamp for determinism
        meta: { color: null, locked: false, note: null },
    };

    /**
     * buildNode
     * Recursively builds the subtree starting at `node`.
     * @param node - the node we're populating with children
     * @param depth - current depth (0 = root)
     */
    function buildNode(node: TreeNode, depth: number): void {
        // Stop recursing if we've hit max depth
        if (depth >= config.maxDepth) return;

        // Should this node branch (have children)?
        const branchProb =
        config.branchProbabilityByDepth[depth] ??
        config.branchProbabilityByDepth[config.branchProbabilityByDepth.length - 1];

        if (!structureRng.chance(branchProb)) return;

        // How many children?
        const maxAllowed =
        mode === "trinary"
            ? TRINARY_MAX_CHILDREN
            : config.maxChildrenNary;

        const childCount = structureRng.nextInt(config.minChildren, maxAllowed);

        for (let i = 0; i < childCount; i++) {
            const isFile = structureRng.chance(config.fileProbability);

            const child = isFile
                ? createFileNode(nameRng, usedNames, makeId)
                : createFolderNode(nameRng, usedNames, metaRng, makeId);

            node.children.push(child);

            // Only recurse into folders
            if (child.type === "folder") {
                buildNode(child, depth + 1);
            }
        }
    }

    buildNode(root, 0);
    return root;
}

// ─── Node Creators ────────────────────────────────────────────────────────────

/**
 * createFolderNode
 * Picks a unique folder name and optional color metadata.
 */
function createFolderNode(
    nameRng: ReturnType<typeof createSeededRandom>,
    usedNames: Set<string>,
    metaRng: ReturnType<typeof createSeededRandom>,
    makeId: () => string
): TreeNode {
    const name = pickUniqueName(nameRng, FOLDER_NAMES, usedNames, "folder");

    // 30% chance of having a color tag
    const FOLDER_COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];
    const color = metaRng.chance(0.3) ? metaRng.pick(FOLDER_COLORS) : null;

    return {
        id: makeId(),
        name,
        type: "folder",
        extension: null,
        children: [],
        createdAt: 0, // fixed for determinism — real nodes use Date.now()
        meta: { color, locked: false, note: null },
    };
}

/**
 * createFileNode
 * Picks a unique file name and a random extension.
 */
function createFileNode(
    nameRng: ReturnType<typeof createSeededRandom>,
    usedNames: Set<string>,
    makeId: () => string
): TreeNode {
    const baseName = pickUniqueName(nameRng, FILE_NAMES, usedNames, "file");
    const extension = nameRng.pick(FILE_EXTENSIONS);
    const fullName = `${baseName}${extension}`;

    return {
        id: makeId(),
        name: fullName,
        type: "file",
        extension,
        children: [],
        createdAt: 0, // fixed for determinism — real nodes use Date.now()
        meta: { color: null, locked: false, note: null },
    };
}

/**
 * pickUniqueName
 * Tries to pick a name not already used.
 * Falls back to appending a number suffix if all names are taken.
 *
 * LEARNING: This is a common procedural generation pattern —
 * try random picks, fall back to guaranteed-unique suffix.
 */
function pickUniqueName(
    rng: ReturnType<typeof createSeededRandom>,
    bank: string[],
    usedNames: Set<string>,
    prefix: string,
    maxAttempts = 10
): string {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = rng.pick(bank);
        if (!usedNames.has(candidate)) {
            usedNames.add(candidate);
            return candidate;
        }
    }

    // All names tried — generate a guaranteed-unique fallback
    let suffix = 1;
    let fallback: string;
    do {
        fallback = `${prefix}_${suffix++}`;
    } while (usedNames.has(fallback));

    usedNames.add(fallback);
    return fallback;
}

// ─── Regeneration Helpers ─────────────────────────────────────────────────────

/**
 * regenerateSubtree
 * Replaces a specific node's children with a freshly generated subtree.
 * Useful for "refreshing" a folder while keeping the rest of the vault intact.
 *
 * Uses a sub-hash derived from the original hash + node ID to stay deterministic.
 */
export async function regenerateSubtreeHash(
    nodeId: string,
    parentHash: string
): Promise<string> {
    // Combine hash + nodeId and re-hash to get a unique sub-seed
    const combined = `${parentHash}:${nodeId}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(hashBuffer);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}