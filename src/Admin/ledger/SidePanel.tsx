import { ReactNode, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

interface SidePanelProps {
  title: string;
  titleId: string;
  // Called for ✕, Escape and scrim click alike. Radix's own close is always prevented and
  // delegated here, so the owner decides whether to actually close (e.g. confirm discarding
  // unsaved changes) by unmounting the panel.
  onRequestClose: () => void;
  // Focus target when the element that opened the panel is gone by the time it closes (e.g.
  // the empty-state "Crear plan" button, replaced by the first row). Must be focusable
  // (tabIndex={-1} on a heading is enough).
  fallbackFocusId: string;
  children: ReactNode;
  testId: string;
}

const FIRST_CONTROL =
  "input:not([disabled]), select:not([disabled]), textarea:not([disabled])";

// Figma Gestión de Planes side panel on radix Dialog (focus trap, scroll lock, aria-modal,
// inert background): scrim over the page, 420px sheet on the right (full width below md) on the
// design system's card surface — the one thing on the page that isn't the cream shell.
export function SidePanel({
  title,
  titleId,
  onRequestClose,
  fallbackFocusId,
  children,
  testId,
}: SidePanelProps) {
  // Captured on first render, before radix moves focus into the dialog.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  const requestClose = (event: Event) => {
    event.preventDefault();
    onRequestClose();
  };

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-overlay-scrim"
          data-testid={`${testId}-scrim`}
        />
        <Dialog.Content
          aria-labelledby={titleId}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const content = event.currentTarget as HTMLElement;
            content.querySelector<HTMLElement>(FIRST_CONTROL)?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = opener?.isConnected
              ? opener
              : document.getElementById(fallbackFocusId);
            target?.focus();
          }}
          onEscapeKeyDown={requestClose}
          onPointerDownOutside={requestClose}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-6 overflow-y-auto border-l border-border-default bg-card p-8 focus:outline-none md:w-105"
          data-testid={testId}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title id={titleId} className="type-h3 text-text-primary">
              {title}
            </Dialog.Title>
            <button
              type="button"
              onClick={onRequestClose}
              aria-label="Cerrar"
              className="-m-1 p-1 text-text-secondary hover:text-text-primary"
              data-testid={`${testId}-close`}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface SidePanelFooterProps {
  children: ReactNode;
  error?: string | null;
  errorTestId: string;
}

// Figma panel footer: border-t, actions right-aligned; a failed save shows inline above them
// so the form stays filled in and the admin can retry.
export function SidePanelFooter({
  children,
  error,
  errorTestId,
}: SidePanelFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-default pt-6">
      {error && (
        <p
          role="alert"
          className="type-body-sm break-words text-destructive"
          data-testid={errorTestId}
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">{children}</div>
    </div>
  );
}
