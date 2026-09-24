import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@lila-care/design-system";

export type AdminNavTone = "default" | "neutral";

export interface AdminNavLink {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AdminNavItemProps {
  link: AdminNavLink;
  active: boolean;
  tone: AdminNavTone;
}

// Active state is a 2px mark on the edge, never a filled pill (Ledger spec). Colors go on the
// inner icon/label, not the <a>: index.css has an unlayered `a:hover { color }` that would
// beat any Tailwind utility set on the link itself.
function activeMarkClass(tone: AdminNavTone): string {
  return tone === "neutral" ? "bg-surface-brand-light" : "bg-teal-500";
}

function labelClass(active: boolean): string {
  return active
    ? "type-body-md-strong text-text-on-brand"
    : "type-body-md text-surface-brand-light";
}

export function AdminNavItem({ link, active, tone }: AdminNavItemProps) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className="relative flex h-10 items-center gap-3 pl-6 md:justify-center md:pl-0 lg:justify-start lg:pl-6"
      data-testid={`nav-item-${link.id}`}
    >
      {active && (
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-0.5",
            activeMarkClass(tone),
          )}
          aria-hidden="true"
          data-testid="nav-active-mark"
        />
      )}
      <Icon
        className={cn(
          "size-5 shrink-0",
          active ? "text-text-on-brand" : "text-surface-brand-light",
        )}
        aria-hidden="true"
      />
      <span className={cn(labelClass(active), "md:sr-only lg:not-sr-only")}>
        {link.label}
      </span>
    </Link>
  );
}

// Mobile bottom tab (Figma 375, 94x64 per item): icon over label, active mark on the top edge.
export function AdminTabItem({ link, active, tone }: AdminNavItemProps) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className="relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1"
      data-testid={`tab-item-${link.id}`}
    >
      {active && (
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            activeMarkClass(tone),
          )}
          aria-hidden="true"
        />
      )}
      <Icon
        className={cn(
          "size-5 shrink-0",
          active ? "text-text-on-brand" : "text-surface-brand-light",
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "truncate",
          active
            ? "type-caption-medium text-text-on-brand"
            : "type-caption text-surface-brand-light",
        )}
      >
        {link.label}
      </span>
    </Link>
  );
}
