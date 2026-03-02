/**
 * components/explorer/Breadcrumb.tsx
 */

import { ChevronRight, Home } from "lucide-react";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { getPath } from "../../core/tree";
import s from "../../styles/breadcrumb.module.scss";

export function Breadcrumb() {
    const vault = useActiveVault();
    const { selectedNodeId, selectNode } = useFileSystem();

    if (!vault || !selectedNodeId) return null;

    const path = getPath(vault.tree, selectedNodeId);

    return (
        <nav className={s.breadcrumb} aria-label="Breadcrumb">
            {path.map((node, i) => {
                const isLast = i === path.length - 1;
                const isRoot = i === 0;

                return (
                    <span key={node.id} className={s.segment}>
                        {i > 0 && <ChevronRight size={11} className={s.separator} />}

                        <button
                            onClick={() => !isLast && selectNode(node.id)}
                            className={`${s.crumb} ${isLast ? s.crumbActive : s.crumbLink}`}>
                            {isRoot && <Home size={10} />}
                            {node.name}
                        </button>
                    </span>
                );
            })}
        </nav>
    );
}