import { Link } from "wouter";
import {
  formatCount,
  formatRelativeDate,
  formatShortDate,
} from "@/Admin/dashboardFormat";
import { DashboardUserListItemDto } from "@/api/users";
import { StageMarker } from "@/Admin/ledger/StageMarker";
import { USERS_LIST_COLUMNS } from "@/Admin/ledger/ledgerColumns";
import {
  describeCycleReports,
  describeStage,
  STAGE_MARKERS,
} from "@/Admin/usersFormat";

interface UserRowProps {
  user: DashboardUserListItemDto;
  // Opens the detail panel for this user (the row is the one focusable element).
  href: string;
  testId?: string;
  // The row whose detail panel is open (Figma: surface/brand-light).
  selected?: boolean;
}

// Figma UserRow (886:2129). Row (>=xl): 40px ledger line with a hover-only chevron. Stacked
// (<xl, Figma 768/375): line 1 = email | relative time, line 2 = stage | "N conv. · N
// reportes". One <a> per row; text colors sit on the inner spans because index.css has an
// unlayered `a:hover { color }` that would override a color set on the link.
export function UserRow({ user, href, testId = "user-row", selected = false }: UserRowProps) {
  const lastActivity = formatRelativeDate(user.lastActivityAt);
  return (
    <li
      className={`border-b border-border-default ${selected ? "bg-surface-brand-light" : ""}`}
      data-testid={testId}
      data-selected={selected || undefined}
    >
      <Link
        href={href}
        className={`group grid ${USERS_LIST_COLUMNS} items-center gap-x-3 gap-y-1 py-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-700 xl:h-10 xl:py-0`}
      >
        <span
          className={`type-body-md col-start-1 row-start-1 min-w-0 truncate ${
            user.email ? "text-text-primary" : "text-text-secondary"
          }`}
        >
          {user.email ?? "Sin email"}
        </span>
        <span className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 xl:col-start-2 xl:row-start-1">
          <StageMarker variant={STAGE_MARKERS[user.stage]} />
          <span
            className="type-body-sm xl:type-body-md min-w-0 truncate text-text-primary"
            data-testid="user-row-stage"
            title={describeStage(user)}
          >
            {describeStage(user)}
          </span>
        </span>
        <span className="type-body-sm hidden text-text-secondary xl:col-start-3 xl:row-start-1 xl:block">
          {formatShortDate(user.createdAt)}
        </span>
        <span className="type-body-sm col-start-2 row-start-2 text-right text-text-secondary xl:hidden">
          {formatCount(user.conversations)} conv. ·{" "}
          {describeCycleReports(user.cycleReports)}
        </span>
        <span className="type-body-md hidden text-right tabular-nums text-text-primary xl:col-start-4 xl:row-start-1 xl:block">
          {formatCount(user.conversations)}
        </span>
        <span className="type-body-md hidden text-right tabular-nums text-text-primary xl:col-start-5 xl:row-start-1 xl:block">
          {formatCount(user.cycleReports)}
        </span>
        <span
          className="type-body-sm col-start-2 row-start-1 text-right text-text-secondary xl:col-start-6"
          data-testid="user-row-last-activity"
        >
          {lastActivity}
        </span>
        <span
          className="hidden text-base leading-6 text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 xl:col-start-7 xl:row-start-1 xl:block"
          aria-hidden="true"
        >
          ›
        </span>
      </Link>
    </li>
  );
}
