/**
 * hooks/usePasswordVault.ts
 *
 * Handles the password-gated vault lifecycle:
 *   - Submitting a password → hash it → check if vault exists → unlock or generate
 *   - Locking the active vault
 *   - Registering a completely new vault
 *
 * LEARNING: This hook is the bridge between:
 *   - core/hashPassword.ts  (pure async hashing)
 *   - core/treeGenerator.ts (pure tree generation)
 *   - utils/localStorage.ts (persistence)
 *   - store/useVaultStore   (React state)
 *
 * Components just call unlock(password) — all the orchestration is here.
 */

import { useCallback } from "react";
import { hashPassword, hashToVaultId } from "../core/hashPassword";
import { generateTreeFromHash } from "../core/treeGenerator";
import { loadVault, touchVault } from "../utils/localStorage";
import { useVaultStore } from "../store/useVaultStore";
import type { TreeMode } from "../core/tree";
import type { VaultEntry } from "../utils/localStorage";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePasswordVault() {
  const { state, dispatch } = useVaultStore();

  /**
   * unlock
   * The main entry point. Given a password string:
   *   1. Hash it
   *   2. Check localStorage for an existing vault with that hash
   *   3a. If found → restore it (same password = same vault)
   *   3b. If NOT found → generate a new random tree from the hash (new vault)
   *
   * LEARNING: This is async because hashing is async (Web Crypto API).
   * useCallback memoizes the function so it doesn't re-create on every render.
   */
  const unlock = useCallback(
    async (password: string, preferredMode: TreeMode = "nary") => {
      if (!password.trim()) {
        dispatch({ type: "SET_ERROR", payload: { error: "Password cannot be empty." } });
        return;
      }

      dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
      dispatch({ type: "SET_ERROR", payload: { error: null } });

      try {
        // Step 1: Hash the password
        const hash = await hashPassword(password);
        const vaultId = hashToVaultId(hash);

        // Step 2: Check if this vault already exists in localStorage
        const existing = loadVault(hash);

        if (existing) {
          // ── Returning vault ──
          // Same password → same vault → restore from storage
          touchVault(hash); // update lastAccessedAt
          dispatch({ type: "VAULT_UNLOCK", payload: existing });
        } else {
          // ── New vault ──
          // Password never seen before → generate a unique tree from its hash
          const tree = generateTreeFromHash(hash, preferredMode);

          const newVault: VaultEntry = {
            hash,
            vaultId,
            tree,
            mode: preferredMode,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
          };

          // VAULT_UNLOCK triggers the useEffect in VaultStoreProvider
          // which auto-saves the new vault to localStorage
          dispatch({ type: "VAULT_UNLOCK", payload: newVault });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        dispatch({ type: "SET_ERROR", payload: { error: `Failed to unlock: ${message}` } });
      }
    },
    [dispatch]
  );

  /**
   * lock
   * Clears the active vault from state (doesn't delete from localStorage).
   * The vault is still there — user can unlock again with the same password.
   */
  const lock = useCallback(() => {
    dispatch({ type: "VAULT_LOCK" });
  }, [dispatch]);

  /**
   * changeMode
   * Switches between nary and trinary for the active vault.
   * Note: changing mode doesn't regenerate the tree — it just changes
   * the constraint rule going forward for new children.
   */
  const changeMode = useCallback(
    (mode: TreeMode) => {
      dispatch({ type: "VAULT_CHANGE_MODE", payload: { mode } });
    },
    [dispatch]
  );

  return {
    unlock,
    lock,
    changeMode,
    isLoading: state.isLoading,
    error: state.error,
    activeVault: state.activeVault,
    isLocked: state.activeVault === null,
  };
}