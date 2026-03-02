import React from "react";
/**
 * components/explorer/TreeNode.tsx
 */

import { useState } from "react";
import {
    Folder,
    FolderOpen,
    File,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import type { TreeNode as TreeNodeType } from "../../core/tree";
import { useFileSystem } from "../../hooks/useFileSystem";
import { getFolderColor } from "../../utils/fileIcons";
import s from "../../styles/treenode.module.scss";

interface TreeNodeProps {
    node: TreeNodeType;
    depth?: number;
    key?: React.Key;
}

export function TreeNode({ node, depth = 0 }: TreeNodeProps) {
    const { selectedNodeId, selectNode } = useFileSystem();
    const [isOpen, setIsOpen] = useState(depth === 0);

    const isSelected = selectedNodeId === node.id;
    const isFolder = node.type === "folder";
    const hasChildren = node.children.length > 0;
    const folderColor = getFolderColor(node.meta.color);

    const handleClick = () => {
        selectNode(node.id);
        if (isFolder) setIsOpen((prev: boolean) => !prev);
    };

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
            </div>

            {isFolder && isOpen && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}