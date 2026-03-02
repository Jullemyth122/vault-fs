/**
 * components/explorer/ContentPanel.tsx
 */

import { Folder, FolderOpen, File } from "lucide-react";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { findNode } from "../../core/tree";
import { getFileIcon, getFolderColor } from "../../utils/fileIcons";
import { Breadcrumb } from "./Breadcrumb";
import s from "../../styles/contentpanel.module.scss";

export function ContentPanel() {
    const vault = useActiveVault();
    const { selectedNodeId, selectNode } = useFileSystem();

    if (!vault) return null;

    const selectedNode = selectedNodeId
        ? findNode(vault.tree, selectedNodeId)
        : vault.tree;

    if (selectedNode?.type === "file") {
        const icon = getFileIcon(selectedNode.extension);
        return (
            <div className={s.panel}>
                <div className={s.breadcrumbRow}>
                    <Breadcrumb />
                </div>
                <div className={s.fileCard}>
                    <File size={36} className={icon.color} />
                    <div>
                        <p className={s.fileName}>{selectedNode.name}</p>
                        <p className={s.fileMeta}>
                            {icon.label}
                            {selectedNode.extension && ` · ${selectedNode.extension}`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const displayNode = selectedNode ?? vault.tree;
    const children = displayNode.children;

    return (
        <div className={s.panel}>
            <div className={s.breadcrumbRow}>
                <Breadcrumb />
            </div>

            {children.length === 0 && (
                <div className={s.empty}>
                    <FolderOpen size={36} className={s.emptyIcon} />
                    <p className={s.emptyTitle}>This folder is empty</p>
                    <p className={s.emptySubtitle}>Use the toolbar to add files or folders</p>
                </div>
            )}

            {children.length > 0 && (
                <div className={s.grid}>
                    {children.map((child) => {
                        const isFolder = child.type === "folder";
                        const icon = isFolder ? null : getFileIcon(child.extension);
                        const folderColor = isFolder ? getFolderColor(child.meta.color) : "";

                        return (
                            <button
                                key={child.id}
                                onClick={() => selectNode(child.id)}
                                className={s.gridItem}>

                                {isFolder
                                    ? <Folder size={28} className={folderColor} />
                                    : <File size={28} className={icon!.color} />
                                }

                                <span className={s.itemName}>{child.name}</span>

                                <span className={s.itemMeta}>
                                    {isFolder
                                        ? `${child.children.length} item${child.children.length !== 1 ? "s" : ""}`
                                        : (icon?.label ?? "File")
                                    }
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}