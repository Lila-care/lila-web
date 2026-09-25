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

// Active state is a 2px mark on the edge, never a filled pill (Ledger spec). Icons are teal in
// every state; only the label changes weight/color. Colors go on the inner icon/label, not the
// <a>: index.css has an unlayered `a:hover { color }` that beats any utility on the link.
function activeMarkClass(tone: AdminNavTone): string {
  return tone === "neutral" ? "bg-surface-brand-light" : "bg-teal-500";
}

const ICON_CLASS = "size-5 shrink-0 text-teal-500";

// Rail (md) = icon over an 11/16 label; sidebar (lg) = icon beside a 14/22 label.
function sidebarLabelClass(active: boolean): string {
  return active
    ? "type-caption-medium text-text-on-brand lg:type-body-md-strong"
    : "type-caption text-surface-brand-light lg:type-body-md";
}

export function AdminNavItem({ link, active, tone }: AdminNavItemProps) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className="relative flex h-16 flex-col items-center justify-center gap-1 lg:h-10 lg:flex-row lg:justify-start lg:gap-3 lg:pl-6"
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
      <Icon className={ICON_CLASS} aria-hidden="true" />
      <span className={sidebarLabelClass(active)}>{link.label}</span>
    </Link>
  );
}

// Mobile bottom tab (Figma 375, 75x64 per item with 5 sections): icon over label, active mark
// on the top edge.
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
      <Icon className={ICON_CLASS} aria-hidden="true" />
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
