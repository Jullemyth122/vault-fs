/**
 * components/explorer/Explorer.tsx
 */

import { Toolbar } from "../toolbar/Toolbar";
import { TreePanel } from "./TreePanel";
import { ContentPanel } from "./ContentPanel";
import s from "../../styles/explorer.module.scss";

export function Explorer() {
    return (
        <div className={s.root}>
            <Toolbar />

            <div className={s.body}>
                <aside className={s.sidebar}>
                    <TreePanel />
                </aside>

                <main className={s.content}>
                    <ContentPanel />
                </main>
            </div>
        </div>
    );
}