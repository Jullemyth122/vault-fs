/**
 * store/useVaultStore.ts
 *
 * The global state provider for VaultFS.
 * Combines React Context + useReducer to share state across the whole app.
 *
 * LEARNING: Context + useReducer is the "React-native" alternative to Redux.
 *   - useReducer gives us the same reducer pattern as Redux
 *   - Context makes the state + dispatch available to any component
 *   - No external libraries needed
 *
 * HOW TO USE IN COMPONENTS:
 *   const { state, dispatch } = useVaultStore();
 *   const { state, dispatch } = useVaultStore();
 *   dispatch({ type: "NODE_SELECT", payload: { nodeId: "abc" } });
 *
 * WRAP YOUR APP:
 *   <VaultStoreProvider>
 *     <App />
 *   </VaultStoreProvider>
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";

import { vaultReducer, INITIAL_STATE } from "./vaultReducer";
import type { VaultState, VaultAction } from "./vaultReducer";
import { saveVault } from "../utils/localStorage";
import { findNode } from "../core/tree";

// ─── Context ──────────────────────────────────────────────────────────────────

interface VaultStoreContextValue {
  state: VaultState;
  dispatch: Dispatch<VaultAction>;
}

/**
 * VaultStoreContext
 * The React context that holds state + dispatch.
 * We initialize it as null and assert non-null in the hook —
 * this gives a clear error if someone uses the hook outside the provider.
 */
const VaultStoreContext = createContext<VaultStoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface VaultStoreProviderProps {
  children: ReactNode;
}

/**
 * VaultStoreProvider
 * Wrap your entire app with this component.
 * It initializes the reducer and makes state + dispatch available everywhere.
 *
 * LEARNING: This is the Provider pattern.
 *   Think of it as a "global container" that any child component can reach into.
 */
export function VaultStoreProvider({ children }: VaultStoreProviderProps) {
  const [state, dispatch] = useReducer(vaultReducer, INITIAL_STATE);

  /**
   * Auto-save to localStorage whenever activeVault changes.
   *
   * LEARNING: useEffect with [state.activeVault] as dependency means
   * "run this effect every time activeVault changes".
   * This keeps localStorage always in sync without manual save calls.
   */
  useEffect(() => {
    if (state.activeVault) {
      saveVault(state.activeVault);
    }
  }, [state.activeVault]);

  return (
    <VaultStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </VaultStoreContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useVaultStore
 * The hook components use to access global state and dispatch actions.
 *
 * USAGE:
 *   const { state, dispatch } = useVaultStore();
 *
 * Throws a clear error if used outside VaultStoreProvider.
 */
export function useVaultStore(): VaultStoreContextValue {
  const ctx = useContext(VaultStoreContext);
  if (!ctx) {
    throw new Error(
      "useVaultStore must be used inside <VaultStoreProvider>. " +
      "Did you forget to wrap your app?"
    );
  }
  return ctx;
}

// ─── Selector Hooks ───────────────────────────────────────────────────────────
//
// LEARNING: Selector hooks are small focused hooks that return
// a specific slice of state. They prevent components from needing
// to know the full state shape.

/**
 * useActiveVault
 * Returns the currently unlocked vault, or null.
 */
export function useActiveVault() {
  const { state } = useVaultStore();
  return state.activeVault;
}

/**
 * useSelectedNode
 * Returns the currently selected TreeNode, or null.
 * Performs the findNode lookup so components don't have to.
 */
export function useSelectedNode() {
  const { state } = useVaultStore();
  if (!state.activeVault || !state.selectedNodeId) return null;
  return findNode(state.activeVault.tree, state.selectedNodeId) ?? null;
}

/**
 * useIsLocked
 * True if no vault is currently unlocked.
 */
export function useIsLocked() {
  const { state } = useVaultStore();
  return state.activeVault === null;
}

/**
 * useCanNavigateBack
 * True if there's history to go back to.
 */
export function useCanNavigateBack() {
  const { state } = useVaultStore();
  return state.navigationIndex > 0;
}

/**
 * useCanNavigateForward
 * True if there's forward history to go to.
 */
export function useCanNavigateForward() {
  const { state } = useVaultStore();
  return state.navigationIndex < state.navigationHistory.length - 1;
}