/**
 * components/vault/VaultBadge.tsx
 */

import { Shield, LogOut } from "lucide-react";
import { usePasswordVault } from "../../hooks/usePasswordVault";
import s from "../../styles/vaultbadge.module.scss";

export function VaultBadge() {
    const { activeVault, lock } = usePasswordVault();
    if (!activeVault) return null;

    return (
        <div className={s.wrapper}>
            <div className={s.vaultId}>
                <Shield size={11} className={s.shieldIcon} />
                <span className={s.vaultIdText}>{activeVault.vaultId}</span>
            </div>

            <div className={s.modeBadge}>
                <span className={s.modeText}>
                    {activeVault.mode === "trinary" ? "3-ary" : "n-ary"}
                </span>
            </div>

            <button onClick={lock} title="Lock vault" className={s.lockBtn}>
                <LogOut size={13} />
            </button>
        </div>
    );
}