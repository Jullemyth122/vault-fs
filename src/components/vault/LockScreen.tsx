import React, { useState, type KeyboardEvent } from "react";
import { Eye, EyeOff, Lock, Unlock, Shield } from "lucide-react";
import { usePasswordVault } from "../../hooks/usePasswordVault";
import { validatePasswordStrength } from "../../core/hashPassword";
import { loadAllVaults } from "../../utils/localStorage";
import s from "../../styles/lockscreen.module.scss";

export function LockScreen() {
    const { unlock, isLoading, error } = usePasswordVault();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [preferredMode, setPreferredMode] = useState<"nary" | "trinary">("nary");

    const recentVaults = loadAllVaults().slice(0, 3);
    const strength = password ? validatePasswordStrength(password) : null;

    const handleSubmit = () => {
        if (!password.trim() || isLoading) return;
        unlock(password, preferredMode);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <div className={s.page}>
            <div className={s.container}>

                <header className={s.header}>
                    <div className={s.logo}>
                        <Shield size={26} />
                        <h1 className={s.title}>VaultFS</h1>
                    </div>
                    <p className={s.subtitle}>Enter any password — new password = new vault.</p>
                </header>

                <div className={s.card}>

                    <div className={s.field}>
                        <label className={s.label}>Password</label>
                        <div className={s.inputWrap}>
                            <span className={s.inputIcon}><Lock size={13} /></span>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter vault password..."
                                autoFocus
                                className={s.input}
                            />
                            <button className={s.eyeBtn} onClick={() => setShowPassword((p: boolean) => !p)} type="button">
                                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                        </div>
                        {strength && (
                            <>
                                <div className={s.strengthBar}>
                                    <div className={`${s.strengthFill} ${s[strength.strength]}`} />
                                </div>
                                <p className={`${s.strengthText} ${s[strength.strength]}`}>{strength.message}</p>
                            </>
                        )}
                    </div>

                    <div className={s.field}>
                        <label className={s.label}>Tree Mode <span style={{ opacity: 0.5 }}>(for new vaults)</span></label>
                        <div className={s.modeGrid}>
                            {(["nary", "trinary"] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setPreferredMode(m)}
                                    className={`${s.modeBtn} ${preferredMode === m ? s.modeBtnActive : ""}`}
                                >
                                    {m === "nary" ? "N-ary (free)" : "Trinary (max 3)"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className={s.error}>{error}</div>}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!password.trim() || isLoading}
                        className={`${s.submitBtn} ${password.trim() && !isLoading ? s.active : s.inactive}`}
                    >
                        {isLoading
                            ? <><div className={s.spinner} /> Hashing...</>
                            : <><Unlock size={13} /> Unlock Vault</>
                        }
                    </button>
                </div>

                {recentVaults.length > 0 && (
                    <div className={s.recentSection}>
                        <p className={s.recentLabel}>Recent Vaults</p>
                        <div className={s.recentList}>
                            {recentVaults.map((v) => (
                                <div key={v.hash} className={s.recentItem}>
                                    <span className={s.recentId}>{v.vaultId}</span>
                                    <span className={s.recentMeta}>{v.mode} · {v.tree.children.length} items</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}