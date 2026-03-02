/**
 * components/shared/ActionDropdown.tsx
 *
 * A simple ⋮ (triple-dot) button that opens a small inline dropdown
 * with actions like Rename, Delete, New Folder, New File.
 *
 * This replaces the right-click context menu approach.
 * The component only handles the dropdown — modals (rename input,
 * delete confirm) are managed by the PARENT component so they
 * never accidentally unmount.
 */

import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";
import s from "../../styles/actiondropdown.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionItem {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "danger";
}

interface ActionDropdownProps {
    actions: ActionItem[];
    /** Optional: extra class for the trigger button */
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActionDropdown({ actions, className }: ActionDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen]);

    // Calculate dropdown position (portal-based for correct z-index)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 160;
        const dropdownHeight = actions.length * 32 + 16;

        let top = rect.bottom + 4;
        let left = rect.right - dropdownWidth;

        // Keep within viewport
        if (left < 8) left = 8;
        if (top + dropdownHeight > window.innerHeight - 8) {
            top = rect.top - dropdownHeight - 4;
        }

        setDropdownPos({ top, left });
    }, [isOpen, actions.length]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen((prev) => !prev);
    };

    const handleAction = (action: ActionItem) => {
        if (action.disabled) return;
        setIsOpen(false);
        action.onClick();
    };

    return (
        <>
            <button
                ref={triggerRef}
                onClick={handleToggle}
                className={`${s.trigger} ${isOpen ? s.triggerActive : ""} ${className ?? ""}`}
                title="Actions"
            >
                <MoreVertical size={13} />
            </button>

            {isOpen && createPortal(
                <>
                    <div
                        className={s.overlay}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    />

                    <div
                        ref={dropdownRef}
                        className={s.dropdown}
                        style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {actions.map((action, i) => (
                            <button
                                key={action.label + i}
                                onClick={() => handleAction(action)}
                                disabled={action.disabled}
                                className={`${s.item} ${action.variant === "danger" ? s.itemDanger : ""} ${action.disabled ? s.itemDisabled : ""}`}
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
