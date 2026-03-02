/**
 * components/shared/ContextMenu.tsx
 */

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    FolderPlus,
    FilePlus,
    Pencil,
    Trash2,
    Palette,
    ChevronRight,
} from "lucide-react";
import type { TreeNode } from "../../core/tree";
import { canAddChild } from "../../core/tree";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useActiveVault } from "../../store/useVaultStore";
import { Modal } from "./Modal";
import s from "../../styles/contextmenu.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    node: TreeNode | null;
}

export const CLOSED_MENU: ContextMenuState = {
    isOpen: false,
    x: 0,
    y: 0,
    node: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContextMenu() {
    const [menuState, setMenuState] = useState<ContextMenuState>(CLOSED_MENU);

    const openMenu = (e: React.MouseEvent, node: TreeNode) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({ isOpen: true, x: e.clientX, y: e.clientY, node });
    };

    const closeMenu = () => setMenuState(CLOSED_MENU);

    return { menuState, openMenu, closeMenu };
}

// ─── Color Options ────────────────────────────────────────────────────────────

const FOLDER_COLORS: Array<{ hex: string; label: string }> = [
    { hex: "#7c3aed", label: "Violet" },
    { hex: "#0891b2", label: "Cyan" },
    { hex: "#059669", label: "Emerald" },
    { hex: "#d97706", label: "Amber" },
    { hex: "#dc2626", label: "Red" },
];

// ─── Context Menu Component ───────────────────────────────────────────────────

interface ContextMenuProps {
    state: ContextMenuState;
    onClose: () => void;
}

export function ContextMenu({ state, onClose }: ContextMenuProps) {
    const { isOpen, x, y, node } = state;
    const vault = useActiveVault();
    const fs = useFileSystem();
    const menuRef = useRef<HTMLDivElement>(null);

    const [showRename, setShowRename] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [showNewFile, setShowNewFile] = useState(false);
    const [showColors, setShowColors] = useState(false);

    const [pos, setPos] = useState({ x, y });

    useEffect(() => {
        if (!isOpen || !menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
            x: x + rect.width > vw ? x - rect.width : x,
            y: y + rect.height > vh ? y - rect.height : y,
        });
    }, [isOpen, x, y]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    if (!isOpen || !node || !vault) return null;

    const isRoot = node.id === vault.tree.id;
    const isFolder = node.type === "folder";
    const canAdd = canAddChild(node, vault.mode);

    const menuItem = (
        icon: React.ReactNode,
        label: string,
        onClick: () => void,
        disabled = false,
        variant: "default" | "danger" = "default"
    ) => (
        <button
            key={label}
            onClick={() => { if (!disabled) { onClick(); onClose(); } }}
            disabled={disabled}
            className={`${s.menuItem} ${disabled ? s.menuItemDisabled : ""} ${variant === "danger" ? s.menuItemDanger : ""}`}>
            {icon}
            <span>{label}</span>
        </button>
    );

    const divider = (key: string) => (
        <div key={key} className={s.divider} />
    );

    return createPortal(
        <>
            <div className={s.overlay} onClick={onClose} />

            <div
                ref={menuRef}
                className={s.menu}
                style={{
                    top: pos.y,
                    left: pos.x,
                    opacity: pos.x === x && pos.y === y ? 0 : 1,
                }}>

                <div className={s.nodeLabel}>
                    <span className={isFolder ? s.nodeLabelIconFolder : s.nodeLabelIconFile}>
                        {isFolder ? "📁" : "📄"}
                    </span>
                    <span className={s.nodeLabelName}>{node.name}</span>
                </div>

                {isFolder && menuItem(<FolderPlus size={13} />, "New Folder", () => setShowNewFolder(true), !canAdd)}
                {isFolder && menuItem(<FilePlus size={13} />, "New File", () => setShowNewFile(true), !canAdd)}
                {isFolder && divider("d1")}

                {menuItem(<Pencil size={13} />, "Rename", () => setShowRename(true))}

                {isFolder && (
                    <div className={s.colorPickerWrapper}>
                        <button
                            onClick={() => setShowColors((prev: boolean) => !prev)}
                            className={`${s.menuItem} ${showColors ? s.menuItemActive : ""}`}>
                            <span className={s.menuItemInner}>
                                <Palette size={13} />
                                <span>Set Color</span>
                            </span>
                            <ChevronRight size={11} />
                        </button>

                        {showColors && (
                            <div className={s.colorPanel}>
                                <button
                                    onClick={() => { fs.updateColor(node.id, null); onClose(); }}
                                    title="No color"
                                    className={s.colorSwatch_clear}>
                                    ✕
                                </button>
                                {FOLDER_COLORS.map((c) => (
                                    <button
                                        key={c.hex}
                                        onClick={() => { fs.updateColor(node.id, c.hex); onClose(); }}
                                        title={c.label}
                                        className={`${s.colorSwatch} ${node.meta.color === c.hex ? s.colorSwatchActive : ""}`}
                                        style={{ background: c.hex }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {divider("d2")}

                {menuItem(<Trash2 size={13} />, "Delete", () => setShowDelete(true), isRoot, "danger")}
            </div>

            <Modal.Input
                isOpen={showRename}
                onClose={() => setShowRename(false)}
                onSubmit={(name) => fs.rename(node.id, name)}
                title="Rename"
                label="New name"
                initialValue={node.name}
                submitLabel="Rename"
            />

            <Modal.Confirm
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={() => fs.remove(node.id)}
                title={`Delete ${node.type}`}
                message={
                    isFolder && node.children.length > 0
                        ? `Delete "${node.name}" and all ${node.children.length} item(s) inside it? This cannot be undone.`
                        : `Delete "${node.name}"? This cannot be undone.`
                }
                confirmLabel="Delete"
                variant="danger"
            />

            <Modal.Input
                isOpen={showNewFolder}
                onClose={() => setShowNewFolder(false)}
                onSubmit={(name) => fs.createFolder(name, node.id)}
                title="New Folder"
                label="Folder name"
                placeholder="my-folder"
                submitLabel="Create"
            />

            <Modal.Input
                isOpen={showNewFile}
                onClose={() => setShowNewFile(false)}
                onSubmit={(name) => fs.createFile(name, node.id)}
                title="New File"
                label="File name"
                placeholder="notes.txt"
                submitLabel="Create"
            />
        </>,
        document.body
    );
}