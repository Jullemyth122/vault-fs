/**
 * components/explorer/TreePanel.tsx
 */

import { GitBranch } from "lucide-react";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { getTreeStats } from "../../core/tree";
import { TreeNode } from "./TreeNode";
import s from "../../styles/treepanel.module.scss";

export function TreePanel() {
    const vault = useActiveVault();
    const { tree } = useFileSystem();

    if (!vault || !tree) {
        return (
            <div className={s.empty}>No vault loaded.</div>
        );
    }

    const stats = getTreeStats(tree);

    return (
        <div className={s.panel}>
            <div className={s.header}>
                <GitBranch size={13} className={s.headerIcon} />
                <span className={s.headerLabel}>Explorer</span>
            </div>

            <div className={s.tree}>
                <TreeNode node={tree} depth={0} />
            </div>

            <div className={s.footer}>
                <span>{stats.totalFolders} <span className={s.accentText}>folders</span></span>
                <span>{stats.totalFiles} <span className={s.mutedText}>files</span></span>
                <span>depth {stats.maxDepth}</span>
            </div>
        </div>
    );
}