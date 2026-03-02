/**
 * components/toolbar/Toolbar.tsx
 */

import React, { useState } from "react";
import { FolderPlus, FilePlus, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useFileSystem } from "../../hooks/useFileSystem";
import { VaultBadge } from "../vault/VaultBadge";
import { TreeModeToggle } from "./TreeModeToggle";
import s from "../../styles/toolbar.module.scss";

export function Toolbar() {
    const {
        selectedNodeId,
        createFolder,
        createFile,
        canGoBack,
        canGoForward,
        navigateBack,
        navigateForward,
        tree,
    } = useFileSystem();

    const [creating, setCreating] = useState<"folder" | "file" | null>(null);
    const [inputVal, setInputVal] = useState("");

    const parentId = selectedNodeId ?? tree?.id ?? "";

    const handleCreate = () => {
        if (!inputVal.trim()) { setCreating(null); return; }
        if (creating === "folder") createFolder(inputVal, parentId);
        else if (creating === "file") createFile(inputVal, parentId);
        setCreating(null);
        setInputVal("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleCreate();
        if (e.key === "Escape") { setCreating(null); setInputVal(""); }
    };

    const startCreating = (type: "folder" | "file") => {
        setCreating(type);
        setInputVal(type === "file" ? "untitled.txt" : "new-folder");
        setTimeout(() => {
            (document.getElementById("toolbar-create-input") as HTMLInputElement)?.select();
        }, 50);
    };

    return (
        <div className={s.toolbar}>
            <div className={s.appTitle}>
                <Shield size={15} className={s.appIcon} />
                <span className={s.appName}>VaultFS</span>
            </div>

            <div className={s.divider} />

            <div className={s.navGroup}>
                <button
                    onClick={navigateBack}
                    disabled={!canGoBack}
                    title="Back"
                    className={`${s.navBtn} ${!canGoBack ? s.navBtnDisabled : ""}`}>
                    <ChevronLeft size={14} />
                </button>
                <button
                    onClick={navigateForward}
                    disabled={!canGoForward}
                    title="Forward"
                    className={`${s.navBtn} ${!canGoForward ? s.navBtnDisabled : ""}`}>
                    <ChevronRight size={14} />
                </button>
            </div>

            <div className={s.divider} />

            {creating ? (
                <div className={s.createInput}>
                    <span className={s.createInputIcon}>
                        {creating === "folder" ? "📁" : "📄"}
                    </span>
                    <input
                        id="toolbar-create-input"
                        value={inputVal}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleCreate}
                        autoFocus
                        className={s.createInputField}
                    />
                    <span className={s.createInputHint}>Enter ↵ to confirm</span>
                </div>
            ) : (
                <div className={s.createGroup}>
                    <button onClick={() => startCreating("folder")} title="New folder" className={s.createBtn}>
                        <FolderPlus size={13} /> New Folder
                    </button>
                    <button onClick={() => startCreating("file")} title="New file" className={s.createBtn}>
                        <FilePlus size={13} /> New File
                    </button>
                </div>
            )}

            <div className={s.spacer} />

            <TreeModeToggle />

            <div className={s.divider} />

            <VaultBadge />
        </div>
    );
}