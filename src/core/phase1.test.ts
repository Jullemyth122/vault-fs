/**
 * core/phase1.test.ts
 *
 * Manual verification tests for all Phase 1 core logic.
 * Run with: npx tsx src/core/phase1.test.ts
 *
 * This file is NOT part of the final app — it's a learning/debug tool
 * to confirm that each core module works before adding React.
 *
 * Think of this as your "unit test lite" before setting up Jest/Vitest.
 */

import {
  createRootNode,
  createNode,
  findNode,
  getPath,
  insertChild,
  removeNode,
  renameNode,
  moveNode,
  canAddChild,
  getTreeStats,
} from "./tree";

import {
  bfsToArray,
  dfsPreOrderToArray,
  searchByName,
  getLevel,
  getLeafNodes,
} from "./treeTraversal";

import {
  createSeededRandom,
  hashStringToSeed,
  hashStringToSeeds,
} from "./seedRandom";

import { hashPassword, hashToVaultId, validatePasswordStrength } from "./hashPassword";

import { generateTreeFromHash, DEFAULT_CONFIG } from "./treeGenerator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pass = (msg: string) => console.log(`  ✅ ${msg}`);
const fail = (msg: string, err?: unknown) => console.error(`  ❌ ${msg}`, err ?? "");
const section = (title: string) => console.log(`\n── ${title} ${"─".repeat(40 - title.length)}`);

function assert(condition: boolean, message: string): void {
  if (condition) pass(message);
  else fail(message);
}

const password = "Password123!";

// ─── Test: tree.ts ────────────────────────────────────────────────────────────

section("tree.ts");

const root = createRootNode("root");
const folderA = createNode({ name: "documents", type: "folder" });
const folderB = createNode({ name: "media", type: "folder" });
const folderC = createNode({ name: "projects", type: "folder" });

const fileC = createNode({ name: "readme.txt", type: "file", extension: ".txt" });
const fileD = createNode({ name: "photo.jpg", type: "file", extension: ".jpg" });

// Build: root → [documents → [readme.txt], media → [photo.jpg]]
let tree = insertChild(root, root.id, folderA, "nary");
tree = insertChild(tree, root.id, folderB, "nary");
tree = insertChild(tree, folderA.id, fileC, "nary");
tree = insertChild(tree, folderB.id, fileD, "nary");


tree = insertChild(tree, root.id, folderC, "nary");
tree = insertChild(tree, folderC.id, fileC, "nary");
tree = insertChild(tree, folderC.id, fileD, "nary");

assert(tree.children.length === 3, "root has 3 children");
assert(findNode(tree, folderA.id)?.name === "documents", "findNode finds documents");
assert(findNode(tree, fileC.id)?.name === "readme.txt", "findNode finds nested file");
assert(getPath(tree, fileC.id).length === 3, "path to readme.txt has 3 nodes");
assert(getPath(tree, fileC.id)[2].name === "readme.txt", "last item in path is readme.txt");

// Trinary constraint
const trinaryFolder = createNode({ name: "tight", type: "folder" });
let tf = insertChild(root, root.id, trinaryFolder, "nary");
for (let i = 0; i < 3; i++) {
  tf = insertChild(tf, trinaryFolder.id, createNode({ name: `child${i}`, type: "folder" }), "trinary");
}
const tnode = findNode(tf, trinaryFolder.id)!;
assert(!canAddChild(tnode, "trinary"), "trinary: can't add 4th child");
assert(canAddChild(tnode, "nary"), "nary: can still add child");

// Rename
let renamed = renameNode(tree, fileC.id, "RENAMED.md");
assert(findNode(renamed, fileC.id)?.name === "RENAMED.md", "renameNode works");
assert(findNode(renamed, fileC.id)?.extension === ".md", "extension updated on rename");

// Remove
let removed = removeNode(tree, fileD.id)!;
assert(findNode(removed, fileD.id) === null, "removeNode removes node");
assert(removeNode(tree, tree.id) === null, "removeNode refuses to remove root");

// Move
let moved = moveNode(tree, fileC.id, folderB.id, "nary");
const newFolderB = findNode(moved, folderB.id)!;
assert(newFolderB.children.some(c => c.id === fileC.id), "moveNode: file moved to new parent");
assert(!findNode(moved, folderA.id)!.children.some(c => c.id === fileC.id), "moveNode: file no longer in old parent");

// Stats
const stats = getTreeStats(tree);
assert(stats.totalNodes === 8, `stats: totalNodes=8, got ${stats.totalNodes}`);
assert(stats.totalFiles === 4, `stats: totalFiles=4, got ${stats.totalFiles}`);
assert(stats.maxDepth === 2, `stats: maxDepth=2, got ${stats.maxDepth}`);

// ─── Test: treeTraversal.ts ───────────────────────────────────────────────────

section("treeTraversal.ts");

const bfs = bfsToArray(tree);
assert(bfs[0].name === "root", "BFS: root first");
assert(bfs[1].name === "documents" || bfs[1].name === "media", "BFS: children second");
assert(bfs.length === 8, `BFS: all 6 nodes, got ${bfs.length}`);

const dfs = dfsPreOrderToArray(tree);
assert(dfs[0].name === "root", "DFS: root first");
assert(dfs[1].name === "documents", "DFS pre-order: documents before media");

const searchResults = searchByName(tree, "doc");
assert(searchResults.length === 1, "search 'doc' finds 1 result");
assert(searchResults[0].node.name === "documents", "search finds 'documents'");
assert(searchResults[0].path[0].name === "root", "search path starts at root");

const level1 = getLevel(tree, 1);
assert(level1.length > 0, `getLevel(1) returns ${level1.length} nodes`);
assert(level1.length === 3, "getLevel(1) returns 2 nodes");

const leaves = getLeafNodes(tree);
assert(leaves.every(n => n.children.length === 0), "getLeafNodes: all leaves have no children");

// ─── Test: seedRandom.ts ──────────────────────────────────────────────────────

section("seedRandom.ts");

const rng1 = createSeededRandom(12345);
const rng2 = createSeededRandom(12345);

const seq1 = Array.from({ length: 5 }, () => rng1.next());
const seq2 = Array.from({ length: 5 }, () => rng2.next());
assert(
  seq1.every((v, i) => v === seq2[i]),
  "same seed produces same sequence"
);

const rng3 = createSeededRandom(99999);
assert(rng3.nextInt(1, 6) >= 1 && rng3.nextInt(1, 6) <= 6, "nextInt in range [1,6]");
assert(["a","b","c"].includes(rng3.pick(["a","b","c"])), "pick returns item from array");

const arr = [1, 2, 3, 4, 5];
const shuffled = rng3.shuffle(arr);
assert(shuffled.length === arr.length, "shuffle preserves length");
assert(arr.join() === "1,2,3,4,5", "shuffle does not mutate original");

const seed = hashStringToSeed("a3f9c2b1deadbeef");
assert(typeof seed === "number" && !isNaN(seed), "hashStringToSeed returns valid number");

const seeds = hashStringToSeeds("a3f9c2b1deadbeef11223344aabbccdd", 3);
assert(seeds.length === 3, "hashStringToSeeds returns 3 seeds");
assert(seeds.every(s => typeof s === "number"), "all seeds are numbers");

// ─── Test: hashPassword.ts ────────────────────────────────────────────────────

section("hashPassword.ts (async)");

(async () => {
  const hash1 = await hashPassword("hello");
  const hash2 = await hashPassword("hello");
  const hash3 = await hashPassword("world");

  assert(hash1 === hash2, "same password → same hash");
  assert(hash1 !== hash3, "different passwords → different hashes");
  assert(hash1.length === 64, `SHA-256 hash is 64 hex chars, got ${hash1.length}`);

  const vaultId = hashToVaultId(hash1);
  assert(vaultId.length === 8, "vaultId is 8 chars");

  const weak = validatePasswordStrength("ab");
  const medium = validatePasswordStrength("hello");
  const strong = validatePasswordStrength("superSecure123");
  assert(weak.strength === "weak", "short password is weak");
  assert(medium.strength === "medium", "medium length password is medium");
  assert(strong.strength === "strong", "long password is strong");

  // ─── Test: treeGenerator.ts ───────────────────────────────────────────────

  section("treeGenerator.ts (async)");

  const hash = await hashPassword(password);

  const treeA_nary = generateTreeFromHash(hash, "nary");
  const treeA_nary2 = generateTreeFromHash(hash, "nary");
  const treeA_trinary = generateTreeFromHash(hash, "trinary");
  const treeDiff = generateTreeFromHash(await hashPassword("differentPassword"), "nary");

  // Determinism
  assert(
    JSON.stringify(treeA_nary) === JSON.stringify(treeA_nary2),
    "same hash + mode → identical tree (deterministic)"
  );

  // Different mode = different shape
  assert(
    JSON.stringify(treeA_nary) !== JSON.stringify(treeA_trinary),
    "nary vs trinary give different trees"
  );

  // Different password = different tree
  assert(
    JSON.stringify(treeA_nary) !== JSON.stringify(treeDiff),
    "different passwords → different trees"
  );

  // Trinary constraint check
  function checkTrinarySatisfied(node: TreeNode): boolean {
    if (node.children.length > 3) return false;
    return node.children.every(checkTrinarySatisfied);
  }
  assert(checkTrinarySatisfied(treeA_trinary), "trinary tree: no node has > 3 children");

  // Basic shape
  const treeStats2 = getTreeStats(treeA_nary);
  assert(treeStats2.totalNodes > 1, `generated tree has > 1 node (got ${treeStats2.totalNodes})`);
  assert(treeStats2.maxDepth <= DEFAULT_CONFIG.maxDepth, "tree depth within config limit");

  console.log("\n🎉 Phase 1 complete! All core logic verified.\n");
  console.log("📊 Sample generated tree stats:");
  console.log(`   N-ary:   ${treeStats2.totalNodes} nodes, depth ${treeStats2.maxDepth}`);
  console.log(`   Trinary: ${getTreeStats(treeA_trinary).totalNodes} nodes, depth ${getTreeStats(treeA_trinary).maxDepth}`);
  console.log(`   Vault ID for ${password}: ${hashToVaultId(hash)}`);
})();

// Needed for TS type-check in the IIFE above
import type { TreeNode } from "./tree";