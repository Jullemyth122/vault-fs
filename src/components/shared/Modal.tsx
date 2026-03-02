/**
 * components/shared/Modal.tsx
 */

import React, {
    useEffect,
    useRef,
    type ReactNode,
    type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import s from "../../styles/modal.module.scss";

// ─── Base Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    width?: number;
}

export function Modal({ isOpen, onClose, title, children, width = 400 }: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={s.backdrop}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                if (e.target === e.currentTarget) onClose();
            }}>

            <div
                className={s.dialog}
                style={{ maxWidth: `${width}px` }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>

                <div className={s.header}>
                    <h2 id="modal-title" className={s.title}>{title}</h2>
                    <button onClick={onClose} className={s.closeBtn}>
                        <X size={14} />
                    </button>
                </div>

                <div className={s.body}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Modal.Confirm ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "default" | "danger";
}

function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    variant = "default",
}: ConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) setTimeout(() => confirmRef.current?.focus(), 50);
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width={360}>
            <p className={s.confirmMessage}>{message}</p>

            <div className={s.actions}>
                <button onClick={onClose} className={s.cancelBtn}>Cancel</button>
                <button
                    ref={confirmRef}
                    onClick={() => { onConfirm(); onClose(); }}
                    className={`${s.confirmBtn} ${variant === "danger" ? s.confirmBtnDanger : s.confirmBtnDefault}`}>
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

// ─── Modal.Input ──────────────────────────────────────────────────────────────

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title: string;
    label: string;
    placeholder?: string;
    initialValue?: string;
    submitLabel?: string;
}

function InputModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    label,
    placeholder = "",
    initialValue = "",
    submitLabel = "OK",
}: InputModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = React.useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = () => {
        if (!value.trim()) return;
        onSubmit(value.trim());
        onClose();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width={360}>
            <label className={s.inputLabel}>{label}</label>
            <input
                ref={inputRef}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={s.input}
            />

            <div className={s.actions}>
                <button onClick={onClose} className={s.cancelBtn}>Cancel</button>
                <button
                    onClick={handleSubmit}
                    disabled={!value.trim()}
                    className={`${s.submitBtn} ${value.trim() ? s.submitBtnActive : s.submitBtnDisabled}`}>
                    {submitLabel}
                </button>
            </div>
        </Modal>
    );
}

// ─── Attach sub-components ────────────────────────────────────────────────────

Modal.Confirm = ConfirmModal;
Modal.Input = InputModal;