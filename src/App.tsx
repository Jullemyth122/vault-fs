/**
 * App.tsx
 *
 * The root component. Dead simple:
 *   - If no vault is unlocked → show LockScreen
 *   - If vault is unlocked → show Explorer
 *
 * LEARNING: This is the "conditional rendering" pattern at the top level.
 * One boolean (isLocked) drives the entire view switch.
 * All the complexity lives in the components and hooks below.
 */

import { useIsLocked } from "./store/useVaultStore";
import { LockScreen } from "./components/vault/LockScreen";
import { Explorer } from "./components/explorer/Explorer";
import './styles/global.scss'
import './styles/token.scss'
export function App() {
  const isLocked = useIsLocked();

  return isLocked ? <LockScreen /> : <Explorer />;
}