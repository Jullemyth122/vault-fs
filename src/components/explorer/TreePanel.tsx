/**
 * components/explorer/TreePanel.tsx
 *
 * The sidebar tree view panel.
 * Renders the tree structure and manages modals for CRUD operations.
 * Modals live HERE (at the panel level) so they're always mounted.
 */

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { getTreeStats } from "../../core/tree";
import type { TreeNode as TreeNodeType } from "../../core/tree";
import { TreeNode } from "./TreeNode";
import type { ModalRequest } from "./TreeNode";
import { Modal } from "../shared/Modal";
import s from "../../styles/treepanel.module.scss";

// ─── Types for modal state ────────────────────────────────────────────────────

interface ModalState {
    type: "rename" | "delete" | "newFolder" | "newFile" | null;
    node: TreeNodeType | null;
}

const CLOSED_MODAL: ModalState = { type: null, node: null };

// ─── Component ────────────────────────────────────────────────────────────────

export function TreePanel() {
    const vault = useActiveVault();
    const { tree, rename, remove, createFolder, createFile } = useFileSystem();
    const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

    if (!vault || !tree) {
        return (
            <div className={s.empty}>No vault loaded.</div>
        );
    }

    const stats = getTreeStats(tree);

    const handleModalRequest = (request: ModalRequest) => {
        setModal({ type: request.type, node: request.node });
    };

    const closeModal = () => setModal(CLOSED_MODAL);

    return (
        <div className={s.panel}>
            <div className={s.header}>
                <GitBranch size={13} className={s.headerIcon} />
                <span className={s.headerLabel}>Explorer</span>
            </div>

            <div className={s.tree}>
                <TreeNode
                    node={tree}
                    depth={0}
                    onRequestModal={handleModalRequest}
                />
            </div>

            <div className={s.footer}>
                <span>{stats.totalFolders} <span className={s.accentText}>folders</span></span>
                <span>{stats.totalFiles} <span className={s.mutedText}>files</span></span>
                <span>depth {stats.maxDepth}</span>
            </div>

            {/* ── Modals (stable, never unmount) ──────────────────────────── */}
            <Modal.Input
                isOpen={modal.type === "rename" && !!modal.node}
                onClose={closeModal}
                onSubmit={(name) => { if (modal.node) rename(modal.node.id, name); }}
                title="Rename"
                label="New name"
                initialValue={modal.node?.name ?? ""}
                submitLabel="Rename"
            />

            <Modal.Confirm
                isOpen={modal.type === "delete" && !!modal.node}
                onClose={closeModal}
                onConfirm={() => { if (modal.node) remove(modal.node.id); }}
                title={`Delete ${modal.node?.type ?? "item"}`}
                message={
                    modal.node?.type === "folder" && (modal.node?.children.length ?? 0) > 0
                        ? `Delete "${modal.node?.name}" and all ${modal.node?.children.length} item(s) inside it? This cannot be undone.`
                        : `Delete "${modal.node?.name ?? ""}"? This cannot be undone.`
                }
                confirmLabel="Delete"
                variant="danger"
            />

            <Modal.Input
                isOpen={modal.type === "newFolder" && !!modal.node}
                onClose={closeModal}
                onSubmit={(name) => { if (modal.node) createFolder(name, modal.node.id); }}
                title="New Folder"
                label="Folder name"
                placeholder="my-folder"
                submitLabel="Create"
            />

            <Modal.Input
                isOpen={modal.type === "newFile" && !!modal.node}
                onClose={closeModal}
                onSubmit={(name) => { if (modal.node) createFile(name, modal.node.id); }}
                title="New File"
                label="File name"
                placeholder="notes.txt"
                submitLabel="Create"
            />
        </div>
    );
}