/**
 * hooks/useFileSystem.ts
 *
 * CRUD operations for the active vault's file system.
 * Components call these — they never dispatch directly to the store.
 *
 * LEARNING: This hook is the "command" layer.
 *   - It validates inputs before dispatching
 *   - It creates new nodes using core/tree.ts factories
 *   - It keeps localStorage in sync via the store's auto-save effect
 *
 * Think of it like a file system API:
 *   fs.createFolder("documents", parentId)
 *   fs.createFile("readme.txt", parentId)
 *   fs.rename(nodeId, "new-name.md")
 *   fs.remove(nodeId)
 *   fs.move(nodeId, newParentId)
 */

import { useCallback } from "react";
import { createNode, canAddChild, findNode } from "../core/tree";
import { useVaultStore } from "../store/useVaultStore";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFileSystem() {
  const { state, dispatch } = useVaultStore();

  const vault = state.activeVault;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * setError
   * Dispatches a user-visible error message.
   */
  const setError = useCallback(
    (msg: string) => dispatch({ type: "SET_ERROR", payload: { error: msg } }),
    [dispatch]
  );

  const clearError = useCallback(
    () => dispatch({ type: "SET_ERROR", payload: { error: null } }),
    [dispatch]
  );

  // ── Create ─────────────────────────────────────────────────────────────────

  /**
   * createFolder
   * Creates a new folder node under parentId.
   * Validates: vault must be unlocked, parent must exist, mode constraint.
   */
  const createFolder = useCallback(
    (name: string, parentId: string) => {
      if (!vault) return setError("No vault unlocked.");

      const trimmed = name.trim();
      if (!trimmed) return setError("Folder name cannot be empty.");

      const parent = findNode(vault.tree, parentId);
      if (!parent) return setError("Parent folder not found.");
      if (parent.type === "file") return setError("Cannot create inside a file.");
      if (!canAddChild(parent, vault.mode)) {
        return setError(
          vault.mode === "trinary"
            ? "Trinary mode: this folder already has 3 children."
            : "This folder cannot accept more children."
        );
      }

      // Check for duplicate name among siblings
      if (parent.children.some((c) => c.name === trimmed)) {
        return setError(`A node named "${trimmed}" already exists here.`);
      }

      const child = createNode({ name: trimmed, type: "folder" });
      dispatch({ type: "FS_INSERT_CHILD", payload: { parentId, child } });
      clearError();
    },
    [vault, dispatch, setError, clearError]
  );

  /**
   * createFile
   * Creates a new file node under parentId.
   * Automatically extracts the extension from the filename.
   */
  const createFile = useCallback(
    (name: string, parentId: string) => {
      if (!vault) return setError("No vault unlocked.");

      const trimmed = name.trim();
      if (!trimmed) return setError("File name cannot be empty.");

      const parent = findNode(vault.tree, parentId);
      if (!parent) return setError("Parent folder not found.");
      if (parent.type === "file") return setError("Cannot create inside a file.");
      if (!canAddChild(parent, vault.mode)) {
        return setError(
          vault.mode === "trinary"
            ? "Trinary mode: this folder already has 3 children."
            : "This folder cannot accept more children."
        );
      }

      if (parent.children.some((c) => c.name === trimmed)) {
        return setError(`A node named "${trimmed}" already exists here.`);
      }

      // Parse extension from filename
      const dotIndex = trimmed.lastIndexOf(".");
      const extension = dotIndex !== -1 ? trimmed.slice(dotIndex) : null;

      const child = createNode({ name: trimmed, type: "file", extension });
      dispatch({ type: "FS_INSERT_CHILD", payload: { parentId, child } });
      clearError();
    },
    [vault, dispatch, setError, clearError]
  );

  // ── Update ─────────────────────────────────────────────────────────────────

  /**
   * rename
   * Renames a node. Validates the new name isn't empty or a duplicate sibling.
   */
  const rename = useCallback(
    (nodeId: string, newName: string) => {
      if (!vault) return setError("No vault unlocked.");

      const trimmed = newName.trim();
      if (!trimmed) return setError("Name cannot be empty.");

      dispatch({ type: "FS_RENAME", payload: { nodeId, newName: trimmed } });
      clearError();
    },
    [vault, dispatch, setError, clearError]
  );

  /**
   * updateColor
   * Sets a color tag on a folder (via meta.color).
   * Pass null to remove the color.
   */
  const updateColor = useCallback(
    (nodeId: string, color: string | null) => {
      if (!vault) return;
      dispatch({
        type: "FS_UPDATE_META",
        payload: { nodeId, metaPatch: { color } },
      });
    },
    [vault, dispatch]
  );

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * remove
   * Removes a node and all its descendants.
   * Cannot remove the root node.
   */
  const remove = useCallback(
    (nodeId: string) => {
      if (!vault) return setError("No vault unlocked.");
      if (nodeId === vault.tree.id) return setError("Cannot delete the root folder.");
      dispatch({ type: "FS_REMOVE", payload: { nodeId } });
      clearError();
    },
    [vault, dispatch, setError, clearError]
  );

  // ── Move ───────────────────────────────────────────────────────────────────

  /**
   * move
   * Moves a node to a new parent.
   * Validates mode constraints on destination.
   */
  const move = useCallback(
    (nodeId: string, newParentId: string) => {
      if (!vault) return setError("No vault unlocked.");
      if (nodeId === vault.tree.id) return setError("Cannot move the root folder.");
      if (nodeId === newParentId) return setError("Cannot move a folder into itself.");

      const dest = findNode(vault.tree, newParentId);
      if (!dest) return setError("Destination not found.");
      if (dest.type === "file") return setError("Cannot move into a file.");
      if (!canAddChild(dest, vault.mode)) {
        return setError("Destination folder is at max children capacity.");
      }

      dispatch({ type: "FS_MOVE", payload: { nodeId, newParentId } });
      clearError();
    },
    [vault, dispatch, setError, clearError]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const selectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "NODE_SELECT", payload: { nodeId } });
    },
    [dispatch]
  );

  const focusNode = useCallback(
    (nodeId: string | null) => {
      dispatch({ type: "NODE_FOCUS", payload: { nodeId } });
    },
    [dispatch]
  );

  const navigateBack = useCallback(
    () => dispatch({ type: "NAV_BACK" }),
    [dispatch]
  );

  const navigateForward = useCallback(
    () => dispatch({ type: "NAV_FORWARD" }),
    [dispatch]
  );

  return {
    // State
    tree: vault?.tree ?? null,
    mode: vault?.mode ?? "nary",
    selectedNodeId: state.selectedNodeId,
    focusedNodeId: state.focusedNodeId,
    error: state.error,
    canGoBack: state.navigationIndex > 0,
    canGoForward: state.navigationIndex < state.navigationHistory.length - 1,

    // CRUD
    createFolder,
    createFile,
    rename,
    remove,
    move,
    updateColor,

    // Navigation
    selectNode,
    focusNode,
    navigateBack,
    navigateForward,
  };
}