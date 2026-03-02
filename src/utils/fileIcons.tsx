/**
 * utils/fileIcons.ts
 *
 * Maps file extensions and node types to icon names and colors.
 * Keeps all icon/color decisions in one place — easy to update.
 *
 * LEARNING: This is the "data-driven" pattern. Instead of writing
 * a big if/else chain in components, we define a lookup table here
 * and components just call getFileIcon(extension).
 */

export interface FileIconInfo {
    /** Lucide icon name (used in components as: import { icon } from "lucide-react") */
    icon: string;
    /** Tailwind color class for the icon */
    color: string;
    /** Human-readable label */
    label: string;
}

// ─── Extension Map ────────────────────────────────────────────────────────────

const EXTENSION_MAP: Record<string, FileIconInfo> = {
    // Documents
    ".txt": { icon: "FileText", color: "text-slate-400", label: "Text File" },
    ".md": { icon: "FileText", color: "text-blue-400", label: "Markdown" },
    ".pdf": { icon: "FileText", color: "text-red-400", label: "PDF" },
    ".doc": { icon: "FileText", color: "text-blue-500", label: "Word Doc" },
    ".docx": { icon: "FileText", color: "text-blue-500", label: "Word Doc" },

    // Data
    ".json": { icon: "Braces", color: "text-yellow-400", label: "JSON" },
    ".csv": { icon: "Table2", color: "text-green-400", label: "CSV" },
    ".xml": { icon: "Code2", color: "text-orange-400", label: "XML" },
    ".yaml": { icon: "Settings", color: "text-purple-400", label: "YAML" },
    ".yml": { icon: "Settings", color: "text-purple-400", label: "YAML" },

    // Logs & Config
    ".log": { icon: "ScrollText", color: "text-slate-500", label: "Log File" },
    ".xlsx": { icon: "Table2", color: "text-green-500", label: "Spreadsheet" },
};

// ─── Folder Colors ────────────────────────────────────────────────────────────

/**
 * Folder color map — maps the meta.color stored on the node
 * to a Tailwind class for the folder icon.
 */
const FOLDER_COLOR_MAP: Record<string, string> = {
    "#7c3aed": "text-violet-400",
    "#0891b2": "text-cyan-400",
    "#059669": "text-emerald-400",
    "#d97706": "text-amber-400",
    "#dc2626": "text-red-400",
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * getFileIcon
 * Returns icon info for a given file extension.
 * Falls back to a generic "File" icon for unknown extensions.
 */
export function getFileIcon(extension: string | null): FileIconInfo {
    if (!extension) return { icon: "File", color: "text-slate-400", label: "File" };
    return EXTENSION_MAP[extension.toLowerCase()] ?? {
        icon: "File",
        color: "text-slate-400",
        label: extension.replace(".", "").toUpperCase() + " File",
    };
}

/**
 * getFolderColor
 * Returns a Tailwind color class for a folder based on its meta.color.
 * Falls back to default violet if color not in map.
 */
export function getFolderColor(metaColor: string | null): string {
    if (!metaColor) return "text-violet-400";
    return FOLDER_COLOR_MAP[metaColor] ?? "text-violet-400";
}