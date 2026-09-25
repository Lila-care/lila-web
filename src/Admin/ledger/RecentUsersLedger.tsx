import { useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { DashboardUserListItemDto } from "@/api/users";
import { formatCount, formatRelativeDate } from "@/Admin/dashboardFormat";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { RECENT_USERS_COLUMNS } from "@/Admin/ledger/ledgerColumns";

type SortKey = "conversations" | "cycleReports";

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  onSort: (key: SortKey) => void;
}

function SortHeader({ label, sortKey, activeKey, onSort }: SortHeaderProps) {
  const isActive = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-pressed={isActive}
      className="flex items-center justify-end gap-1 text-right hover:text-text-primary"
      data-testid={`recent-users-sort-${sortKey}`}
    >
      {isActive && <ArrowDown className="size-3" aria-hidden="true" />}
      {label}
    </button>
  );
}

const COUNT_CELL_CLASS =
  "type-body-sm tabular-nums text-text-secondary lg:type-body-md lg:text-right lg:text-text-primary";

// Stacked (<lg, Figma 768/375): line 1 = email | relative date, line 2 = "N conversaciones ·
// N reportes". The counts wrapper is `lg:contents` so from lg its two cells become the grid's
// columns 2 and 3, and the date falls into column 4.
function RecentUserRow({ user }: { user: DashboardUserListItemDto }) {
  return (
    <li
      className={`grid ${RECENT_USERS_COLUMNS} items-center gap-x-3 gap-y-0.5 border-b border-border-default py-2 lg:h-8 lg:gap-x-0 lg:py-0`}
      data-testid="recent-user-row"
    >
      <span
        className={`type-body-md col-start-1 row-start-1 min-w-0 truncate ${
          user.email ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        {user.email ?? "Sin email"}
      </span>
      <div className="col-span-2 row-start-2 flex gap-1 lg:contents">
        <span className={COUNT_CELL_CLASS}>
          {formatCount(user.conversations)}
          <span className="lg:hidden"> conversaciones</span>
        </span>
        {/* Spaces kept in the text so the line reads "N conversaciones · N reportes" when
            copied or read by a screen reader, not just visually via the flex gap. */}
        <span className="type-body-sm text-text-secondary lg:hidden">
          {" · "}
        </span>
        <span className={COUNT_CELL_CLASS}>
          {formatCount(user.cycleReports)}
          <span className="lg:hidden"> reportes</span>
        </span>
      </div>
      <span
        className="type-body-sm col-start-2 row-start-1 text-right text-text-secondary lg:col-start-4"
        data-testid="recent-user-last-activity"
      >
        {formatRelativeDate(user.lastActivityAt)}
      </span>
    </li>
  );
}

export function RecentUsersLedger({
  users,
}: {
  users: DashboardUserListItemDto[];
}) {
  // null = BE order (lastActivityAt desc). Sorting is always descending: the question an admin
  // asks here is "who uses Lila the most", never "the least".
  const [sortKey, setSortKey] = useState<SortKey | null>(null);

  const sortedUsers = useMemo(
    () =>
      sortKey
        ? [...users].sort((a, b) => b[sortKey] - a[sortKey])
        : users,
    [users, sortKey],
  );

  const toggleSort = (key: SortKey) =>
    setSortKey((current) => (current === key ? null : key));

  return (
    <div className="min-w-0">
      <LedgerHeader className={`hidden lg:grid ${RECENT_USERS_COLUMNS}`}>
        <span>Email</span>
        <SortHeader
          label="Conversaciones"
          sortKey="conversations"
          activeKey={sortKey}
          onSort={toggleSort}
        />
        <SortHeader
          label="Reportes de ciclo"
          sortKey="cycleReports"
          activeKey={sortKey}
          onSort={toggleSort}
        />
        <span className="text-right">Última actividad</span>
      </LedgerHeader>
      <ul>
        {sortedUsers.map((user) => (
          <RecentUserRow key={user.userId} user={user} />
        ))}
      </ul>
    </div>
  );
}
