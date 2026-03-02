/**
 * hooks/useTreeMode.ts
 *
 * Manages switching between N-ary and Trinary tree modes.
 *
 * LEARNING: Sometimes a hook is small and focused.
 * This one has a single job: expose the current mode and a toggle function.
 * Small hooks compose well — you import only what you need.
 */

import { useCallback } from "react";
import { useVaultStore } from "../store/useVaultStore";
import { canAddChild, findNode } from "../core/tree";
import type { TreeMode, TreeNode } from "../core/tree";

export interface TreeModeInfo {
  mode: TreeMode;
  setMode: (mode: TreeMode) => void;
  toggle: () => void;
  isTrinarySafe: boolean; // can we switch to trinary without violating constraints?
  violatingNodes: TreeNode[]; // nodes that would violate trinary if we switched
}

export function useTreeMode(): TreeModeInfo {
  const { state, dispatch } = useVaultStore();
  const vault = state.activeVault;
  const mode = vault?.mode ?? "nary";

  /**
   * findViolatingNodes
   * Before switching to trinary, we check if any node currently has > 3 children.
   * These would violate the trinary constraint.
   * The user should be warned before switching.
   *
   * LEARNING: This is a pre-flight validation — checking constraints
   * BEFORE applying a change, not after.
   */
  const findViolatingNodes = useCallback((): TreeNode[] => {
    if (!vault) return [];
    const violations: TreeNode[] = [];

    function walk(node: TreeNode): void {
      if (node.children.length > 3) violations.push(node);
      node.children.forEach(walk);
    }

    walk(vault.tree);
    return violations;
  }, [vault]);

  const violatingNodes = vault ? findViolatingNodes() : [];
  const isTrinarySafe = violatingNodes.length === 0;

  const setMode = useCallback(
    (newMode: TreeMode) => {
      dispatch({ type: "VAULT_CHANGE_MODE", payload: { mode: newMode } });
    },
    [dispatch]
  );

  const toggle = useCallback(() => {
    setMode(mode === "nary" ? "trinary" : "nary");
  }, [mode, setMode]);

  return { mode, setMode, toggle, isTrinarySafe, violatingNodes };
}