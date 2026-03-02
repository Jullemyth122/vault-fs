/**
 * core/treeTraversal.ts
 *
 * All traversal algorithms for the tree.
 * These are PURE functions — they read the tree but never change it.
 *
 * LEARNING: Traversal means "visit every node in some order."
 * The ORDER matters depending on your goal:
 *
 *   BFS  → level by level (good for "find nearest")
 *   DFS  → go deep first (good for "explore a branch fully")
 *
 * Real-world use in this project:
 *   - BFS: search across all folders at the same depth first
 *   - DFS pre-order: render the sidebar tree top-to-bottom
 *   - DFS post-order: delete a folder (children before parent)
 *   - pathTo: build the breadcrumb trail
 */

/**
 * core/treeTraversal.ts
 *
 * All traversal algorithms for the tree.
 * These are PURE functions — they read the tree but never change it.
 *
 * LEARNING: Traversal means "visit every node in some order."
 * The ORDER matters depending on your goal:
 *
 *   BFS  → level by level (good for "find nearest")
 *   DFS  → go deep first (good for "explore a branch fully")
 *
 * Real-world use in this project:
 *   - BFS: search across all folders at the same depth first
 *   - DFS pre-order: render the sidebar tree top-to-bottom
 *   - DFS post-order: delete a folder (children before parent)
 *   - pathTo: build the breadcrumb trail
 */
import type { TreeNode } from "./tree";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * VisitorFn
 * A callback passed to traversal functions.
 * It receives a node and its depth (0 = root).
 * Returning `false` stops the traversal early (like break in a loop).
 */
export type VisitorFn = (node: TreeNode, depth: number) => void | false;

export interface SearchResult {
    node: TreeNode;
    depth: number;
    path: TreeNode[]; // from root to this node
}

// ─── BFS (Breadth-First Search) ───────────────────────────────────────────────

/**
 * bfs
 * Visits nodes level by level using a queue.
 *
 * LEARNING: BFS uses a queue (FIFO).
 *   1. Start: enqueue root
 *   2. Dequeue a node, visit it, enqueue its children
 *   3. Repeat until queue is empty
 *
 * Visual:
 *        A          ← visited 1st
 *      / | \
 *     B  C  D       ← visited 2nd, 3rd, 4th
 *    / \    |
 *   E   F   G       ← visited 5th, 6th, 7th
 */
export function bfs(root: TreeNode, visitor: VisitorFn): void {
    // Each queue item tracks the node AND its depth
    const queue: Array<{ node: TreeNode; depth: number }> = [
        { node: root, depth: 0 },
    ];

    while (queue.length > 0) {
        // shift() = dequeue from front (FIFO)
        const { node, depth } = queue.shift()!;

        const result = visitor(node, depth);
        if (result === false) return; // early exit

        // Enqueue all children with depth + 1
        for (const child of node.children) {
            queue.push({ node: child, depth: depth + 1 });
        }
    }
}

/**
 * bfsToArray
 * Returns all nodes in BFS order as a flat array.
 * Useful for rendering a "flat list" view or running animations.
 */
export function bfsToArray(root: TreeNode): TreeNode[] {
    const result: TreeNode[] = [];
    bfs(root, (node) => { result.push(node); });
    return result;
}

// ─── DFS (Depth-First Search) ─────────────────────────────────────────────────

/**
 * dfsPreOrder
 * Visit current node BEFORE its children.
 * This is the natural order for rendering a file tree (parent above children).
 *
 * LEARNING: DFS uses a stack (LIFO) — or recursion, which uses the call stack.
 *
 * Visit order for:
 *        A
 *      / | \
 *     B  C  D
 *    / \
 *   E   F
 * → A, B, E, F, C, D
 */
export function dfsPreOrder(root: TreeNode, visitor: VisitorFn): void {
    function walk(node: TreeNode, depth: number): boolean {
        const result = visitor(node, depth);
        if (result === false) return false;

        for (const child of node.children) {
            const shouldContinue = walk(child, depth + 1);
            if (!shouldContinue) return false;
        }

        return true;
    }

    walk(root, 0);
}

/**
 * dfsPostOrder
 * Visit children BEFORE the current node.
 * Use case: safely deleting a subtree (delete leaves first, then parent).
 *
 * Visit order for the same tree:
 * → E, F, B, C, D, A
 */
export function dfsPostOrder(root: TreeNode, visitor: VisitorFn): void {
    function walk(node: TreeNode, depth: number): void {
        for (const child of node.children) {
            walk(child, depth + 1);
        }
        visitor(node, depth);
    }

    walk(root, 0);
}

/**
 * dfsPreOrderToArray
 * Returns nodes in DFS pre-order as a flat array.
 * This is used by TreePanel to render the sidebar in the correct order.
 */
export function dfsPreOrderToArray(root: TreeNode): TreeNode[] {
    const result: TreeNode[] = [];
    dfsPreOrder(root, (node) => { result.push(node); });
    return result;
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * searchByName
 * Finds all nodes whose name contains the query string (case-insensitive).
 * Returns full SearchResult objects including depth and path.
 *
 * LEARNING: We track "path so far" as we recurse — this lets us know
 * the full ancestry of any node we find, which is needed for the breadcrumb.
 */
export function searchByName(
  root: TreeNode,
  query: string
): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    function walk(node: TreeNode, depth: number, pathSoFar: TreeNode[]): void {
        const currentPath = [...pathSoFar, node];

        if (node.name.toLowerCase().includes(lowerQuery)) {
            results.push({ node, depth, path: currentPath });
        }

        for (const child of node.children) {
            walk(child, depth + 1, currentPath);
        }
    }

    walk(root, 0, []);
    return results;
}

/**
 * searchByExtension
 * Finds all file nodes matching a given extension (e.g. ".pdf").
 */
export function searchByExtension(
  root: TreeNode,
  extension: string
): SearchResult[] {
    const results: SearchResult[] = [];
    const ext = extension.toLowerCase();

    function walk(node: TreeNode, depth: number, pathSoFar: TreeNode[]): void {
        const currentPath = [...pathSoFar, node];

        if (node.type === "file" && node.extension?.toLowerCase() === ext) {
            results.push({ node, depth, path: currentPath });
        }

        for (const child of node.children) {
            walk(child, depth + 1, currentPath);
        }
    }

    walk(root, 0, []);
    return results;
}

// ─── Level Utilities ──────────────────────────────────────────────────────────

/**
 * getLevel
 * Returns all nodes at a specific depth level.
 *
 * Example: getLevel(root, 1) returns direct children of root.
 *
 * LEARNING: This is natural with BFS since BFS visits level by level.
 */
export function getLevel(root: TreeNode, targetDepth: number): TreeNode[] {
    const result: TreeNode[] = [];

    bfs(root, (node, depth) => {
        if (depth === targetDepth) result.push(node);
        // Optimization: once we've passed the target depth we can stop
        if (depth > targetDepth) return false;
    });

    return result;
}

/**
 * getLeafNodes
 * Returns all nodes with no children (leaf nodes = files and empty folders).
 * Useful for stats and generating random file placement in treeGenerator.
 */
export function getLeafNodes(root: TreeNode): TreeNode[] {
    const leaves: TreeNode[] = [];

    dfsPreOrder(root, (node) => {
        if (node.children.length === 0) leaves.push(node);
    });

    return leaves;
}

/**
 * countNodesAtEachLevel
 * Returns a map of depth → node count.
 * Useful for visualizing tree "width" at each level.
 */
export function countNodesAtEachLevel(root: TreeNode): Map<number, number> {
    const counts = new Map<number, number>();

    bfs(root, (_, depth) => {
        counts.set(depth, (counts.get(depth) ?? 0) + 1);
    });

    return counts;
}