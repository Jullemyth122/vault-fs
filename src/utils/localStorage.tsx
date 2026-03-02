/**
 * utils/localStorage.ts
 *
 * The persistence layer for VaultFS.
 * Wraps the browser's localStorage API with typed, safe helpers.
 *
 * LEARNING: localStorage only stores strings. So we always:
 *   - JSON.stringify() before saving
 *   - JSON.parse() after loading
 *   - Wrap in try/catch because localStorage can throw
 *     (storage quota exceeded, private browsing mode, etc.)
 *
 * KEY DESIGN:
 *   Each vault is stored under its own hash key:
 *     "vaultfs:vault:<hash>" → serialized VaultEntry
 *
 *   A separate index key tracks all known vault hashes:
 *     "vaultfs:index" → string[] of hashes
 *
 *   This lets us list all vaults without scanning all localStorage keys.
 */

import type { TreeNode, TreeMode } from "../core/tree";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * VaultEntry
 * Everything we need to restore a vault from localStorage.
 */
export interface VaultEntry {
    /** The SHA-256 hash of the password (serves as the vault's identity) */
    hash: string;

    /** Short display ID derived from hash (e.g. "A3F9C2B1") */
    vaultId: string;

    /** The full file system tree */
    tree: TreeNode;

    /** N-ary or Trinary — saved per vault so each vault remembers its mode */
    mode: TreeMode;

    /** When this vault was first created */
    createdAt: number;

    /** When this vault was last accessed */
    lastAccessedAt: number;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const PREFIX = "vaultfs";
const INDEX_KEY = `${PREFIX}:index`;
const vaultKey = (hash: string) => `${PREFIX}:vault:${hash}`;

// ─── Index Helpers ────────────────────────────────────────────────────────────

/**
 * getVaultIndex
 * Returns the list of all stored vault hashes.
 * Returns [] if nothing is stored yet.
 */
function getVaultIndex(): string[] {
    try {
        const raw = localStorage.getItem(INDEX_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

/**
 * setVaultIndex
 * Persists the updated index.
 */
function setVaultIndex(hashes: string[]): void {
    try {
        localStorage.setItem(INDEX_KEY, JSON.stringify(hashes));
    } catch (err) {
        console.error("localStorage: failed to save vault index", err);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * saveVault
 * Persists a VaultEntry to localStorage and registers it in the index.
 * Safe to call multiple times — updates in place if hash already exists.
 */
export function saveVault(entry: VaultEntry): void {
    try {
        localStorage.setItem(vaultKey(entry.hash), JSON.stringify(entry));

        // Register in index if not already there
        const index = getVaultIndex();
        if (!index.includes(entry.hash)) {
            setVaultIndex([...index, entry.hash]);
        }
    } catch (err) {
        console.error("localStorage: failed to save vault", err);
    }
}

/**
 * loadVault
 * Loads a single VaultEntry by its password hash.
 * Returns null if not found or corrupted.
 */
export function loadVault(hash: string): VaultEntry | null {
    try {
        const raw = localStorage.getItem(vaultKey(hash));
        if (!raw) return null;
        return JSON.parse(raw) as VaultEntry;
    } catch {
        return null;
    }
}

/**
 * loadAllVaults
 * Returns all stored VaultEntry objects (for a "recent vaults" list).
 * Skips any corrupted entries.
 */
export function loadAllVaults(): VaultEntry[] {
    const index = getVaultIndex();
    return index
        .map((hash) => loadVault(hash))
        .filter((v): v is VaultEntry => v !== null)
        .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt); // most recent first
}

/**
 * deleteVault
 * Removes a vault from localStorage and from the index.
 */
export function deleteVault(hash: string): void {
    try {
        localStorage.removeItem(vaultKey(hash));
        const index = getVaultIndex().filter((h) => h !== hash);
        setVaultIndex(index);
    } catch (err) {
        console.error("localStorage: failed to delete vault", err);
    }
}

/**
 * vaultExists
 * Quick check — does a vault with this hash already exist?
 */
export function vaultExists(hash: string): boolean {
    return localStorage.getItem(vaultKey(hash)) !== null;
}

/**
 * touchVault
 * Updates lastAccessedAt without rewriting the full tree.
 * Call this every time a vault is unlocked.
 */
export function touchVault(hash: string): void {
    const entry = loadVault(hash);
    if (!entry) return;
    saveVault({ ...entry, lastAccessedAt: Date.now() });
}

/**
 * clearAllVaults
 * Nuclear option — wipe everything. Useful for dev/testing.
 */
export function clearAllVaults(): void {
    const index = getVaultIndex();
    index.forEach((hash) => localStorage.removeItem(vaultKey(hash)));
    localStorage.removeItem(INDEX_KEY);
}