import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

interface Props {
  label: string;
  tabs: TabItem[];
  defaultId?: string;
}

export function Tabs({ label, tabs, defaultId }: Props) {
  const base = useId();
  const [selected, setSelected] = useState(defaultId ?? tabs[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (!next) return;
    setSelected(next.id);
    refs.current[next.id]?.focus();
  }

  const active = tabs.find((t) => t.id === selected) ?? tabs[0];

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-selected={tab.id === active?.id}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={tab.id === active?.id ? 0 : -1}
            className={`${styles.tab} ${tab.id === active?.id ? styles.active : ""}`}
            onClick={() => setSelected(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active?.id}
          className={styles.panel}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
