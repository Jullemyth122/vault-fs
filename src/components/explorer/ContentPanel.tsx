/**
 * components/explorer/ContentPanel.tsx
 *
 * The main content area — shows children of the current folder as a grid,
 * or a file detail card when a file is selected.
 *
 * Each item has a ⋮ (triple-dot) action button for Rename, Delete, etc.
 * Modals live HERE (at the panel level) so they never accidentally unmount.
 */

import { useState } from "react";
import { Folder, FolderOpen, File, Pencil, Trash2, FolderPlus, FilePlus } from "lucide-react";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { findNode, canAddChild } from "../../core/tree";
import type { TreeNode } from "../../core/tree";
import { getFileIcon, getFolderColor } from "../../utils/fileIcons";
import { Breadcrumb } from "./Breadcrumb";
import { ActionDropdown } from "../shared/ActionDropdown";
import type { ActionItem } from "../shared/ActionDropdown";
import { Modal } from "../shared/Modal";
import s from "../../styles/contentpanel.module.scss";

// ─── Types for modal state ────────────────────────────────────────────────────

interface ModalState {
    type: "rename" | "delete" | "newFolder" | "newFile" | null;
    node: TreeNode | null;
}

const CLOSED_MODAL: ModalState = { type: null, node: null };

export function ContentPanel() {
    const vault = useActiveVault();
    const { selectedNodeId, selectNode, rename, remove, createFolder, createFile } = useFileSystem();
    const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

    if (!vault) return null;

    const selectedNode = selectedNodeId
        ? findNode(vault.tree, selectedNodeId)
        : vault.tree;

    // ── Build actions for a given node ────────────────────────────────────────

    const getActionsForNode = (node: TreeNode): ActionItem[] => {
        const isFolder = node.type === "folder";
        const isRoot = node.id === vault.tree.id;
        const canAdd = isFolder && canAddChild(node, vault.mode);
        const actions: ActionItem[] = [];

        if (isFolder) {
            actions.push({
                icon: <FolderPlus size={13} />,
                label: "New Folder",
                onClick: () => setModal({ type: "newFolder", node }),
                disabled: !canAdd,
            });
            actions.push({
                icon: <FilePlus size={13} />,
                label: "New File",
                onClick: () => setModal({ type: "newFile", node }),
                disabled: !canAdd,
            });
        }

        actions.push({
            icon: <Pencil size={13} />,
            label: "Rename",
            onClick: () => setModal({ type: "rename", node }),
        });

        actions.push({
            icon: <Trash2 size={13} />,
            label: "Delete",
            onClick: () => setModal({ type: "delete", node }),
            disabled: isRoot,
            variant: "danger",
        });

        return actions;
    };

    // ── File detail view ─────────────────────────────────────────────────────

    if (selectedNode?.type === "file") {
        const icon = getFileIcon(selectedNode.extension);
        return (
            <div className={s.panel}>
                <div className={s.breadcrumbRow}>
                    <Breadcrumb />
                </div>
                <div className={s.fileCard}>
                    <File size={36} className={icon.color} />
                    <div style={{ flex: 1 }}>
                        <p className={s.fileName}>{selectedNode.name}</p>
                        <p className={s.fileMeta}>
                            {icon.label}
                            {selectedNode.extension && ` · ${selectedNode.extension}`}
                        </p>
                    </div>
                    <ActionDropdown actions={getActionsForNode(selectedNode)} />
                </div>

                {/* ── Modals ──────────────────────────────────────────────── */}
                <RenderModals modal={modal} setModal={setModal} rename={rename} remove={remove} createFolder={createFolder} createFile={createFile} />
            </div>
        );
    }

    // ── Folder grid view ─────────────────────────────────────────────────────

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
                            <div key={child.id} className={s.gridItem}>
                                <div
                                    className={s.gridItemContent}
                                    onClick={() => selectNode(child.id)}
                                >
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
                                </div>

                                <div className={s.gridItemActions}>
                                    <ActionDropdown actions={getActionsForNode(child)} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modals ──────────────────────────────────────────────────── */}
            <RenderModals modal={modal} setModal={setModal} rename={rename} remove={remove} createFolder={createFolder} createFile={createFile} />
        </div>
    );
}

// ─── Modal Renderer (stable, never unmounts) ──────────────────────────────────

interface RenderModalsProps {
    modal: ModalState;
    setModal: (m: ModalState) => void;
    rename: (nodeId: string, newName: string) => void;
    remove: (nodeId: string) => void;
    createFolder: (name: string, parentId: string) => void;
    createFile: (name: string, parentId: string) => void;
}

function RenderModals({ modal, setModal, rename, remove, createFolder, createFile }: RenderModalsProps) {
    const close = () => setModal(CLOSED_MODAL);
    const node = modal.node;

    return (
        <>
            <Modal.Input
                isOpen={modal.type === "rename" && !!node}
                onClose={close}
                onSubmit={(name) => { if (node) rename(node.id, name); }}
                title="Rename"
                label="New name"
                initialValue={node?.name ?? ""}
                submitLabel="Rename"
            />

            <Modal.Confirm
                isOpen={modal.type === "delete" && !!node}
                onClose={close}
                onConfirm={() => { if (node) remove(node.id); }}
                title={`Delete ${node?.type ?? "item"}`}
                message={
                    node?.type === "folder" && (node?.children.length ?? 0) > 0
                        ? `Delete "${node?.name}" and all ${node?.children.length} item(s) inside it? This cannot be undone.`
                        : `Delete "${node?.name ?? ""}"? This cannot be undone.`
                }
                confirmLabel="Delete"
                variant="danger"
            />

            <Modal.Input
                isOpen={modal.type === "newFolder" && !!node}
                onClose={close}
                onSubmit={(name) => { if (node) createFolder(name, node.id); }}
                title="New Folder"
                label="Folder name"
                placeholder="my-folder"
                submitLabel="Create"
            />

            <Modal.Input
                isOpen={modal.type === "newFile" && !!node}
                onClose={close}
                onSubmit={(name) => { if (node) createFile(name, node.id); }}
                title="New File"
                label="File name"
                placeholder="notes.txt"
                submitLabel="Create"
            />
        </>
    );
}