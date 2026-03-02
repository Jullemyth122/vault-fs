/**
 * components/explorer/TreeNode.tsx
 *
 * A single node in the sidebar tree.
 * Now includes a ⋮ action button (visible on hover) for Rename, Delete, etc.
 * The actual modal rendering is handled by the parent (TreePanel).
 */

import { useState } from "react";
import {
    Folder,
    FolderOpen,
    File,
    ChevronRight,
    ChevronDown,
    Pencil,
    Trash2,
    FolderPlus,
    FilePlus,
} from "lucide-react";
import type { TreeNode as TreeNodeType } from "../../core/tree";
import { canAddChild } from "../../core/tree";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { getFolderColor } from "../../utils/fileIcons";
import { ActionDropdown } from "../shared/ActionDropdown";
import type { ActionItem } from "../shared/ActionDropdown";
import s from "../../styles/treenode.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModalRequest {
    type: "rename" | "delete" | "newFolder" | "newFile";
    node: TreeNodeType;
}

interface TreeNodeProps {
    node: TreeNodeType;
    depth?: number;
    /** Callback to request a modal from the parent (TreePanel) */
    onRequestModal: (request: ModalRequest) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TreeNode({ node, depth = 0, onRequestModal }: TreeNodeProps) {
    const { selectedNodeId, selectNode } = useFileSystem();
    const vault = useActiveVault();
    const [isOpen, setIsOpen] = useState(depth === 0);

    const isSelected = selectedNodeId === node.id;
    const isFolder = node.type === "folder";
    const hasChildren = node.children.length > 0;
    const folderColor = getFolderColor(node.meta.color);
    const isRoot = vault ? node.id === vault.tree.id : false;
    const canAdd = isFolder && vault ? canAddChild(node, vault.mode) : false;

    const handleClick = () => {
        selectNode(node.id);
        if (isFolder) setIsOpen((prev: boolean) => !prev);
    };

    // ── Build actions for the ⋮ dropdown ─────────────────────────────────────

    const actions: ActionItem[] = [];

    if (isFolder) {
        actions.push({
            icon: <FolderPlus size={13} />,
            label: "New Folder",
            onClick: () => onRequestModal({ type: "newFolder", node }),
            disabled: !canAdd,
        });
        actions.push({
            icon: <FilePlus size={13} />,
            label: "New File",
            onClick: () => onRequestModal({ type: "newFile", node }),
            disabled: !canAdd,
        });
    }

    actions.push({
        icon: <Pencil size={13} />,
        label: "Rename",
        onClick: () => onRequestModal({ type: "rename", node }),
    });

    actions.push({
        icon: <Trash2 size={13} />,
        label: "Delete",
        onClick: () => onRequestModal({ type: "delete", node }),
        disabled: isRoot,
        variant: "danger",
    });

    return (
        <div className={s.nodeWrapper}>
            <div
                onClick={handleClick}
                className={`${s.row} ${isSelected ? s.rowSelected : ""}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}>

                <span className={s.chevron}>
                    {isFolder && hasChildren ? (
                        isOpen
                            ? <ChevronDown size={11} />
                            : <ChevronRight size={11} />
                    ) : null}
                </span>

                {isFolder ? (
                    isOpen
                        ? <FolderOpen size={14} className={folderColor} />
                        : <Folder size={14} className={folderColor} />
                ) : (
                    <File size={13} className={s.fileIcon} />
                )}

                <span className={`${s.name} ${isSelected ? s.nameSelected : ""}`}>
                    {node.name}
                </span>

                {isFolder && hasChildren && (
                    <span className={s.count}>{node.children.length}</span>
                )}

                <span className={s.actions}>
                    <ActionDropdown actions={actions} />
                </span>
            </div>

            {isFolder && isOpen && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            onRequestModal={onRequestModal}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}