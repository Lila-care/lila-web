import { KeyboardEvent, useRef } from "react";
import { cn } from "@lila-care/design-system";
import { tabId, tabPanelId } from "@/Admin/ledger/tabIds";

export interface LedgerTab<T extends string> {
  id: T;
  label: string;
}

interface LedgerTabsProps<T extends string> {
  tabs: LedgerTab<T>[];
  activeId: T;
  onChange: (id: T) => void;
  label: string;
}

// Underline tabs (Figma Gestión de Planes): active = primary label + 2px primary underline
// sitting on the row's 1px border, never a filled pill. Roving tabindex + arrow keys per the
// WAI-ARIA tabs pattern, with automatic activation (each tab only swaps already-loaded data).
export function LedgerTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  label,
}: LedgerTabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    tabRefs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusTab(moves[event.key]);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex h-8 items-end gap-4 border-b border-border-default md:h-9 md:gap-6"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={isActive}
            // Only the active tab's panel is mounted.
            aria-controls={isActive ? tabPanelId(tab.id) : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "type-label-sm-strong md:type-body-md-strong -mb-px border-b-2 pb-2 md:pb-2.5",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
