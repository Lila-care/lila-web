import { ArrowDown, ArrowUp } from "lucide-react";
import { SortOrder, UsersSortKey } from "@/api/users";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { USERS_LIST_COLUMNS } from "@/Admin/ledger/ledgerColumns";

export interface UsersSortState {
  sort: UsersSortKey;
  order: SortOrder;
  onSort: (key: UsersSortKey) => void;
}

interface HeaderCellProps {
  label: string;
  sortKey: UsersSortKey;
  align?: "right";
  sortState?: UsersSortState;
}

function ariaSortFor(isActive: boolean, order: SortOrder) {
  if (!isActive) return undefined;
  return order === "asc" ? "ascending" : "descending";
}

function HeaderCell({ label, sortKey, align, sortState }: HeaderCellProps) {
  const alignClass = align === "right" ? "justify-end text-right" : "";
  if (!sortState) return <span className={alignClass}>{label}</span>;

  const isActive = sortState.sort === sortKey;
  const Arrow = sortState.order === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = ariaSortFor(isActive, sortState.order);
  return (
    <div role="columnheader" aria-sort={ariaSort} className={`flex ${alignClass}`}>
      <button
        type="button"
        onClick={() => sortState.onSort(sortKey)}
        aria-pressed={isActive}
        className="flex items-center gap-1 rounded-xs hover:text-text-primary focus-visible:outline-2 focus-visible:outline-teal-700"
        data-testid={`users-sort-${sortKey}`}
      >
        {label}
        {isActive && <Arrow className="size-3" aria-hidden="true" />}
      </button>
    </div>
  );
}

// Column header of the users list (shown from `xl`, where the row is a ledger line). With a
// `sortState` the cells are sort buttons (Usuarias page); without it they are plain labels
// (dashboard "Usuarias recientes", ordered by the BE).
export function UsersListHeader({ sortState }: { sortState?: UsersSortState }) {
  return (
    <LedgerHeader className={`hidden gap-x-3 xl:grid ${USERS_LIST_COLUMNS}`}>
      <HeaderCell label="Email" sortKey="email" sortState={sortState} />
      <HeaderCell label="Etapa" sortKey="stage" sortState={sortState} />
      <HeaderCell label="Registrada" sortKey="createdAt" sortState={sortState} />
      <HeaderCell
        label="Conversaciones"
        sortKey="conversations"
        align="right"
        sortState={sortState}
      />
      <HeaderCell
        label="Reportes de ciclo"
        sortKey="cycleReports"
        align="right"
        sortState={sortState}
      />
      <HeaderCell
        label="Última actividad"
        sortKey="lastActivityAt"
        align="right"
        sortState={sortState}
      />
      <span aria-hidden="true" />
    </LedgerHeader>
  );
}
