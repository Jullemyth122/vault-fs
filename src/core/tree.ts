/**
 * core/tree.ts
 *
 * The foundation of the entire project.
 * Defines what a TreeNode looks like and provides pure functions
 * to create, read, update, and delete nodes — NO mutation of the
 * original tree (immutable updates via spread + recursion).
 *
 * WHY IMMUTABLE?
 *   React re-renders when references change. If we mutate in-place,
 *   React won't see the change. We always return a *new* tree.
 *
 * LEARNING: This is the classic "recursive data structure" pattern.
 *   A TreeNode contains an array of TreeNodes — that self-reference
 *   is what makes it a tree.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeType = "folder" | "file";

export type TreeMode = "nary" | "trinary";

export interface NodeMeta {
    color: string | null; // optional color tag on a folder
    locked: boolean; // future: per-node lock
    note: string | null; // future: inline note on a file
}

export interface TreeNode {
    id: string;
    name: string;
    type: NodeType;
    extension: string | null; // e.g. ".txt", ".pdf" — null for folders
    children: TreeNode[]; // N-ary: no limit  |  Trinary: max 3
    createdAt: number; // Unix timestamp (Date.now())
    meta: NodeMeta;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRINARY_MAX_CHILDREN = 3;

const DEFAULT_META: NodeMeta = {
    color: null,
    locked: false,
    note: null,
};

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * createNode
 * The single place where TreeNodes are born.
 * Partial<> lets callers override only the fields they care about.
 */
export function createNode(
    partial: Pick<TreeNode, "name" | "type"> &
        Partial<Omit<TreeNode, "name" | "type">>
): TreeNode {
    return {
        id: crypto.randomUUID(),
        extension: null,
        children: [],
        createdAt: Date.now(),
        meta: { ...DEFAULT_META },
        ...partial,
    };
}

/**
 * createRootNode
 * Every vault tree starts with a single root folder.
 */
export function createRootNode(name = "root"): TreeNode {
    return createNode({ name, type: "folder" });
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

/**
 * findNode
 * Depth-first search by id. Returns the node or null.
 *
 * LEARNING: This is recursive DFS. The function calls itself on each
 * child until it finds the target or exhausts the tree.
 */
export function findNode(root: TreeNode, id: string): TreeNode | null {
    if (root.id === id) return root;

    for (const child of root.children) {
        const found = findNode(child, id);
        if (found) return found;
    }

    return null;
}

/**
 * getPath
 * Returns the list of nodes from root down to the target node (inclusive).
 * Used by Breadcrumb.tsx.
 *
 * Example: root → Documents → Resume.pdf
 *   returns [root, Documents, Resume.pdf]
 */
export function getPath(root: TreeNode, id: string): TreeNode[] {
    // Base case: we found it
    if (root.id === id) return [root];

    for (const child of root.children) {
        const subPath = getPath(child, id);
        if (subPath.length > 0) {
            // Prepend current node to the path found below
            return [root, ...subPath];
        }
    }

    return []; // not found in this branch
}

/**
 * canAddChild
 * Returns true if a node is allowed to accept another child,
 * given the current tree mode.
 *
 * - N-ary: always true (no limit)
 * - Trinary: only if children.length < 3
 * - Files: never (files can't have children)
 */
export function canAddChild(node: TreeNode, mode: TreeMode): boolean {
    if (node.type === "file") return false;
    if (mode === "trinary") return node.children.length < TRINARY_MAX_CHILDREN;
    return true; // nary has no limit
}

// ─── Immutable Tree Mutations ─────────────────────────────────────────────────
//
// Each function below:
//   1. Takes the current root + some args
//   2. Returns a BRAND NEW root with the change applied
//   3. Never touches the original tree
//
// LEARNING: This is the same pattern Redux uses for reducers.
// "Don't mutate state — return a new copy with changes."

/**
 * cloneNode
 * Deep clone a single node and all its descendants.
 * This is the backbone of all immutable updates.
 */
function cloneNode(node: TreeNode): TreeNode {
    return {
        ...node,
        meta: { ...node.meta },
        children: node.children.map(cloneNode),
    };
}

/**
 * insertChild
 * Adds a new child to the node with parentId.
 * Returns the new root, or the original root if parentId not found
 * or the constraint is violated.
 */
export function insertChild(
    root: TreeNode,
    parentId: string,
    child: TreeNode,
    mode: TreeMode
): TreeNode {
    // Clone the whole tree so we don't mutate anything
    const clone = cloneNode(root);
    const parent = findNode(clone, parentId);

    if (!parent) {
        console.warn(`insertChild: node ${parentId} not found`);
        return root;
    }

    if (!canAddChild(parent, mode)) {
        console.warn(
            `insertChild: node ${parentId} cannot accept more children in ${mode} mode`
        );
        return root;
    }

    parent.children.push(child);
    return clone;
}

/**
 * removeNode
 * Removes the node with targetId from the tree.
 * The root node itself cannot be removed.
 * Returns null if trying to remove root; returns new tree otherwise.
 */
export function removeNode(root: TreeNode, targetId: string): TreeNode | null {
    if (root.id === targetId) {
        console.warn("removeNode: cannot remove the root node");
        return null;
    }

    const clone = cloneNode(root);

    /**
     * Inner recursive helper that filters out the target
     * from a node's children list, then recurses into the rest.
     */
    function strip(node: TreeNode): void {
        node.children = node.children.filter((c) => c.id !== targetId);
        node.children.forEach(strip);
    }

        strip(clone);
    return clone;
}

/**
 * renameNode
 * Updates the name (and optionally extension) of the target node.
 */
export function renameNode(
    root: TreeNode,
    targetId: string,
    newName: string
): TreeNode {
    const clone = cloneNode(root);
    const node = findNode(clone, targetId);

    if (!node) {
        console.warn(`renameNode: node ${targetId} not found`);
        return root;
    }

    node.name = newName;

    // Auto-update extension if it's a file and name has a dot
    if (node.type === "file") {
        const dotIndex = newName.lastIndexOf(".");
        node.extension = dotIndex !== -1 ? newName.slice(dotIndex) : null;
    }

    return clone;
}

/**
 * updateMeta
 * Partially updates the meta field of a node.
 * Useful for changing color, locking a node, etc.
 */
export function updateMeta(
    root: TreeNode,
    targetId: string,
    metaPatch: Partial<NodeMeta>
): TreeNode {
    const clone = cloneNode(root);
    const node = findNode(clone, targetId);

    if (!node) {
        console.warn(`updateMeta: node ${targetId} not found`);
        return root;
    }

    node.meta = { ...node.meta, ...metaPatch };
    return clone;
}

/**
 * moveNode
 * Moves a node from its current parent to a new parent.
 * Enforces tree mode constraints on the destination.
 *
 * LEARNING: Move = remove from old location + insert at new location.
 * We must be careful not to move a node into its own subtree.
 */
export function moveNode(
    root: TreeNode,
    nodeId: string,
    newParentId: string,
    mode: TreeMode
): TreeNode {
    if (nodeId === root.id) {
        console.warn("moveNode: cannot move the root");
        return root;
    }

    // Prevent moving a node into its own descendant
    const nodeToMove = findNode(root, nodeId);
    if (!nodeToMove) return root;
    if (findNode(nodeToMove, newParentId)) {
        console.warn("moveNode: cannot move a node into its own subtree");
        return root;
    }

    // Step 1: remove from old location (clone happens inside removeNode)
    const withoutNode = removeNode(root, nodeId);
    if (!withoutNode) return root;

    // Step 2: insert at new location
    return insertChild(withoutNode, newParentId, nodeToMove, mode);
}

// ─── Tree Statistics ──────────────────────────────────────────────────────────

export interface TreeStats {
    totalNodes: number;
    totalFolders: number;
    totalFiles: number;
    maxDepth: number; // longest path from root to any leaf
    maxBranchingFactor: number; // highest children count across all nodes
}

/**
 * getTreeStats
 * Walks the entire tree once and collects aggregate stats.
 * Useful for the stats panel in the UI.
 */
export function getTreeStats(root: TreeNode): TreeStats {
    let totalNodes = 0;
    let totalFolders = 0;
    let totalFiles = 0;
    let maxDepth = 0;
    let maxBranchingFactor = 0;

    function walk(node: TreeNode, depth: number): void {
    totalNodes++;
    if (node.type === "folder") totalFolders++;
    else totalFiles++;

    maxDepth = Math.max(maxDepth, depth);
    maxBranchingFactor = Math.max(maxBranchingFactor, node.children.length);

    node.children.forEach((child) => walk(child, depth + 1));
    }

    walk(root, 0);

    return { totalNodes, totalFolders, totalFiles, maxDepth, maxBranchingFactor };
}
