/**
 * core/hashPassword.ts
 *
 * Converts a plain-text password into a SHA-256 hex string.
 *
 * LEARNING: We NEVER store the raw password anywhere.
 *   We hash it and use the hash as:
 *     1. The localStorage KEY (so we can look up the right vault)
 *     2. The PRNG SEED (so the same password always makes the same tree)
 *
 * WHY SHA-256?
 *   - It's built into the browser via the Web Crypto API (no npm package needed)
 *   - It's a one-way function: you can't reverse the hash to get the password
 *   - It's deterministic: same input → always same output
 *   - It's collision-resistant: different passwords almost certainly give different hashes
 *
 * NOTE ON SECURITY:
 *   SHA-256 alone is NOT suitable for production password storage
 *   (you'd want bcrypt/argon2 with salting). But for a LOCAL, client-side
 *   learning project this is perfectly fine — and it teaches you the concept.
 *
 * HOW WEB CRYPTO WORKS:
 *   1. Encode the string to bytes (TextEncoder)
 *   2. Call crypto.subtle.digest() — async, returns an ArrayBuffer
 *   3. Convert the ArrayBuffer to a hex string (the format we use everywhere)
 */

// ─── Core Hash Function ───────────────────────────────────────────────────────

/**
 * hashPassword
 * Takes a plain-text password string.
 * Returns a Promise that resolves to a 64-character hex string (SHA-256).
 *
 * Usage:
 *   const hash = await hashPassword("mySecret123");
 *   // → "ef92b778bafe771e..." (always the same for "mySecret123")
 */
export async function hashPassword(password: string): Promise<string> {
    if (!password) {
        throw new Error("hashPassword: password cannot be empty");
    }

    // Step 1: Convert the string to a Uint8Array of UTF-8 bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Step 2: Run SHA-256 via the Web Crypto API
    // crypto.subtle is available in all modern browsers and Node 18+
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Step 3: Convert ArrayBuffer → Array of bytes → hex string
    return bufferToHex(hashBuffer);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * bufferToHex
 * Converts an ArrayBuffer (raw bytes) to a lowercase hex string.
 *
 * LEARNING: Each byte is 0-255. We convert each to a 2-digit hex value.
 * padStart(2, "0") ensures single-digit values like "f" become "0f".
 *
 * Example: [0xef, 0x92, 0xb7] → "ef92b7"
 */
function bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

// ─── Vault ID Utilities ───────────────────────────────────────────────────────

/**
 * hashToVaultId
 * Returns a short, human-readable vault ID derived from the hash.
 * Used in the UI badge to show "Vault: a3f9c2b1" without exposing
 * the full hash or the original password.
 *
 * Takes the first 8 characters of the hex hash.
 */
export function hashToVaultId(hexHash: string): string {
    return hexHash.slice(0, 8).toUpperCase();
}

/**
 * arePasswordsEqual
 * Compares two passwords by hashing both and comparing hashes.
 * Avoids storing or comparing raw passwords.
 */
export async function arePasswordsEqual(
    passwordA: string,
    passwordB: string
): Promise<boolean> {
    const [hashA, hashB] = await Promise.all([
        hashPassword(passwordA),
        hashPassword(passwordB),
    ]);
    return hashA === hashB;
}

/**
 * validatePasswordStrength
 * Returns a simple strength assessment for user feedback.
 * This is purely for UX — not a security measure.
 */
export type PasswordStrength = "weak" | "medium" | "strong";

export function validatePasswordStrength(password: string): {
    strength: PasswordStrength;
    message: string;
} {
    if (password.length < 4) {
        return { strength: "weak", message: "Too short — try at least 4 characters" };
    }
    if (password.length < 8) {
        return { strength: "medium", message: "Decent — longer passwords make unique trees" };
    }
    return { strength: "strong", message: "Strong — this vault will be highly unique!" };
}