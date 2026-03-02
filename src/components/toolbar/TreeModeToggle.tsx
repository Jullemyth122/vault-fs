/**
 * components/toolbar/TreeModeToggle.tsx
 */

import { GitBranch } from "lucide-react";
import { useTreeMode } from "../../hooks/useTreeMode";
import s from "../../styles/toolbar.module.scss";

export function TreeModeToggle() {
    const { mode, setMode, isTrinarySafe, violatingNodes } = useTreeMode();

    const handleToggle = (newMode: "nary" | "trinary") => {
        if (newMode === mode) return;

        if (newMode === "trinary" && !isTrinarySafe) {
            const names = violatingNodes.map((n) => `"${n.name}"`).join(", ");
            alert(
                `Cannot switch to Trinary: ${violatingNodes.length} folder(s) have more than 3 children:\n${names}\n\nRemove excess children first.`
            );
            return;
        }

        setMode(newMode);
    };

    return (
        <div className={s.modeToggle}>
            <GitBranch size={12} className={s.modeToggleIcon} />
            <div className={s.modeToggleGroup}>
                {(["nary", "trinary"] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => handleToggle(m)}
                        className={`${s.modeBtn} ${mode === m ? s.modeBtnActive : ""}`}>
                        {m === "nary" ? "N-ary" : "3-ary"}
                    </button>
                ))}
            </div>
        </div>
    );
}