/**
 * store/vaultReducer.ts
 *
 * The brain of VaultFS state management.
 * All state changes happen HERE — nowhere else.
 *
 * LEARNING: The Reducer Pattern
 *   A reducer is a pure function:  (currentState, action) → newState
 *
 *   - Pure: same inputs always give same output, no side effects
 *   - Every action is a plain object describing WHAT happened
 *   - The reducer decides HOW state changes in response
 *
 *   This is the same pattern used by Redux and React's useReducer.
 *   We use useReducer (not Redux) since this is a medium project.
 *
 * WHY THIS MATTERS:
 *   Centralizing all mutations here means:
 *   - Easy to trace every possible state change
 *   - Easy to add logging, undo/redo later
 *   - Components become "dumb" — they dispatch actions, not mutate data
 */

import type { TreeNode, TreeMode } from "../core/tree";
import {
  insertChild,
  removeNode,
  renameNode,
  moveNode,
  updateMeta,
} from "../core/tree";
import type { NodeMeta } from "../core/tree";
import type { VaultEntry } from "../utils/localStorage";

// ─── State Shape ──────────────────────────────────────────────────────────────

/**
 * VaultState
 * The complete application state at any point in time.
 *
 * LEARNING: Designing state shape is one of the most important skills.
 * Ask: "what is the minimum data needed to reconstruct the full UI?"
 */
export interface VaultState {
  /** The currently unlocked vault, or null if on the lock screen */
  activeVault: VaultEntry | null;

  /**
   * The ID of the currently selected/open node in the explorer.
   * null means nothing is selected (show root contents).
   */
  selectedNodeId: string | null;

  /**
   * The ID of the node being "focused" in the tree panel sidebar.
   * Can differ from selectedNodeId (e.g. hover state).
   */
  focusedNodeId: string | null;

  /** Whether the app is currently performing an async operation (hashing, etc.) */
  isLoading: boolean;

  /** User-facing error message. null = no error. */
  error: string | null;

  /**
   * Stack of recently visited node IDs — used for back/forward navigation.
   * LEARNING: This is a simple navigation history, like browser history.
   */
  navigationHistory: string[];
  navigationIndex: number;
}

// ─── Initial State ────────────────────────────────────────────────────────────

export const INITIAL_STATE: VaultState = {
  activeVault: null,
  selectedNodeId: null,
  focusedNodeId: null,
  isLoading: false,
  error: null,
  navigationHistory: [],
  navigationIndex: -1,
};

// ─── Action Types ─────────────────────────────────────────────────────────────
//
// LEARNING: TypeScript discriminated unions for actions.
// Each action has a unique "type" string — TypeScript narrows the
// payload type automatically inside switch cases.

export type VaultAction =
  // ── Vault lifecycle ──────────────────────────────────────────────────────
  | { type: "VAULT_UNLOCK";    payload: VaultEntry }
  | { type: "VAULT_LOCK" }
  | { type: "VAULT_UPDATE_TREE"; payload: { tree: TreeNode } }
  | { type: "VAULT_CHANGE_MODE";  payload: { mode: TreeMode } }

  // ── Navigation ───────────────────────────────────────────────────────────
  | { type: "NODE_SELECT";     payload: { nodeId: string } }
  | { type: "NODE_FOCUS";      payload: { nodeId: string | null } }
  | { type: "NAV_BACK" }
  | { type: "NAV_FORWARD" }

  // ── File system mutations ────────────────────────────────────────────────
  | { type: "FS_INSERT_CHILD"; payload: { parentId: string; child: TreeNode } }
  | { type: "FS_REMOVE";       payload: { nodeId: string } }
  | { type: "FS_RENAME";       payload: { nodeId: string; newName: string } }
  | { type: "FS_MOVE";         payload: { nodeId: string; newParentId: string } }
  | { type: "FS_UPDATE_META";  payload: { nodeId: string; metaPatch: Partial<NodeMeta> } }

  // ── UI state ─────────────────────────────────────────────────────────────
  | { type: "SET_LOADING";     payload: { isLoading: boolean } }
  | { type: "SET_ERROR";       payload: { error: string | null } };

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * vaultReducer
 * The single function that handles ALL state transitions.
 *
 * LEARNING: Notice the pattern in every case:
 *   1. Spread the current state: { ...state }
 *   2. Override only what changed
 *   3. Never mutate `state` directly
 */
export function vaultReducer(
  state: VaultState,
  action: VaultAction
): VaultState {
  switch (action.type) {

    // ── Vault Lifecycle ─────────────────────────────────────────────────────

    case "VAULT_UNLOCK": {
      // Unlock: set the active vault and select the root node
      return {
        ...state,
        activeVault: action.payload,
        selectedNodeId: action.payload.tree.id,  // root is selected by default
        focusedNodeId: action.payload.tree.id,
        error: null,
        isLoading: false,
        navigationHistory: [action.payload.tree.id],
        navigationIndex: 0,
      };
    }

    case "VAULT_LOCK": {
      // Lock: clear everything back to initial state
      return { ...INITIAL_STATE };
    }

    case "VAULT_UPDATE_TREE": {
      // Replace the tree (used after any FS mutation is persisted)
      if (!state.activeVault) return state;
      return {
        ...state,
        activeVault: {
          ...state.activeVault,
          tree: action.payload.tree,
        },
      };
    }

    case "VAULT_CHANGE_MODE": {
      if (!state.activeVault) return state;
      return {
        ...state,
        activeVault: {
          ...state.activeVault,
          mode: action.payload.mode,
        },
      };
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    case "NODE_SELECT": {
      const { nodeId } = action.payload;

      // Build new history: truncate forward history, append new node
      // LEARNING: This is exactly how browser history works.
      const truncated = state.navigationHistory.slice(
        0,
        state.navigationIndex + 1
      );
      const newHistory = [...truncated, nodeId];

      return {
        ...state,
        selectedNodeId: nodeId,
        focusedNodeId: nodeId,
        navigationHistory: newHistory,
        navigationIndex: newHistory.length - 1,
      };
    }

    case "NODE_FOCUS": {
      return { ...state, focusedNodeId: action.payload.nodeId };
    }

    case "NAV_BACK": {
      if (state.navigationIndex <= 0) return state;
      const newIndex = state.navigationIndex - 1;
      return {
        ...state,
        navigationIndex: newIndex,
        selectedNodeId: state.navigationHistory[newIndex],
        focusedNodeId: state.navigationHistory[newIndex],
      };
    }

    case "NAV_FORWARD": {
      if (state.navigationIndex >= state.navigationHistory.length - 1) {
        return state;
      }
      const newIndex = state.navigationIndex + 1;
      return {
        ...state,
        navigationIndex: newIndex,
        selectedNodeId: state.navigationHistory[newIndex],
        focusedNodeId: state.navigationHistory[newIndex],
      };
    }

    // ── File System Mutations ───────────────────────────────────────────────
    //
    // Each FS action:
    //   1. Guards against missing activeVault
    //   2. Calls the appropriate pure function from core/tree.ts
    //   3. Returns new state with updated tree
    //
    // LEARNING: Notice how each case delegates the actual tree logic
    // to core/tree.ts. The reducer only decides WHEN to apply the change.

    case "FS_INSERT_CHILD": {
      if (!state.activeVault) return state;
      const { parentId, child } = action.payload;
      const newTree = insertChild(
        state.activeVault.tree,
        parentId,
        child,
        state.activeVault.mode
      );
      return {
        ...state,
        activeVault: { ...state.activeVault, tree: newTree },
      };
    }

    case "FS_REMOVE": {
      if (!state.activeVault) return state;
      const newTree = removeNode(state.activeVault.tree, action.payload.nodeId);
      if (!newTree) return state; // removeNode returns null for root

      // If the removed node was selected, go back to parent (root)
      const newSelectedId =
        state.selectedNodeId === action.payload.nodeId
          ? state.activeVault.tree.id
          : state.selectedNodeId;

      return {
        ...state,
        activeVault: { ...state.activeVault, tree: newTree },
        selectedNodeId: newSelectedId,
        focusedNodeId: newSelectedId,
      };
    }

    case "FS_RENAME": {
      if (!state.activeVault) return state;
      const { nodeId, newName } = action.payload;
      const newTree = renameNode(state.activeVault.tree, nodeId, newName);
      return {
        ...state,
        activeVault: { ...state.activeVault, tree: newTree },
      };
    }

    case "FS_MOVE": {
      if (!state.activeVault) return state;
      const { nodeId, newParentId } = action.payload;
      const newTree = moveNode(
        state.activeVault.tree,
        nodeId,
        newParentId,
        state.activeVault.mode
      );
      return {
        ...state,
        activeVault: { ...state.activeVault, tree: newTree },
      };
    }

    case "FS_UPDATE_META": {
      if (!state.activeVault) return state;
      const { nodeId, metaPatch } = action.payload;
      const newTree = updateMeta(state.activeVault.tree, nodeId, metaPatch);
      return {
        ...state,
        activeVault: { ...state.activeVault, tree: newTree },
      };
    }

    // ── UI State ────────────────────────────────────────────────────────────

    case "SET_LOADING": {
      return { ...state, isLoading: action.payload.isLoading };
    }

    case "SET_ERROR": {
      return { ...state, error: action.payload.error, isLoading: false };
    }

    default: {
      // LEARNING: TypeScript exhaustive check.
      // If we add a new action type without handling it, TS will error here.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}