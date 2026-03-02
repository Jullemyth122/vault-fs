/**
 * main.tsx
 *
 * The entry point of the React app.
 * Sets up the global provider and mounts the App.
 *
 * LEARNING: The provider wraps EVERYTHING so every component
 * can access the vault store via useVaultStore().
 * If you forget the provider, the hook throws a clear error.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VaultStoreProvider } from "./store/useVaultStore";
import { App } from "./App";
import "./styles/global.scss";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found. Check your index.html.");

createRoot(root).render(
  <StrictMode>
    <VaultStoreProvider>
      <App />
    </VaultStoreProvider>
  </StrictMode>
);