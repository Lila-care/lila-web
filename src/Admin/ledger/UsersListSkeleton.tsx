import { Skeleton } from "@lila-care/design-system";
import { USERS_LIST_COLUMNS } from "@/Admin/ledger/ledgerColumns";

const BAR = "h-2.5 rounded-xs bg-gray-200";

// Figma UserRow `loading` state: flat gray bars on the row grid (stacked below xl: two lines).
export function UsersListSkeleton({ rows, testId }: { rows: number; testId: string }) {
  return (
    <div aria-hidden="true" data-testid={testId}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`grid ${USERS_LIST_COLUMNS} items-center gap-x-3 gap-y-2 border-b border-border-default py-3 xl:h-10 xl:py-0`}
        >
          <Skeleton className={`${BAR} col-start-1 row-start-1 w-3/5 xl:w-60 xl:max-w-full`} />
          <Skeleton className={`${BAR} col-start-1 row-start-2 w-2/5 xl:col-start-2 xl:row-start-1 xl:w-40`} />
          <Skeleton className={`${BAR} hidden w-12 xl:col-start-3 xl:row-start-1 xl:block`} />
          <Skeleton className={`${BAR} hidden w-8 justify-self-end xl:col-start-4 xl:row-start-1 xl:block`} />
          <Skeleton className={`${BAR} hidden w-8 justify-self-end xl:col-start-5 xl:row-start-1 xl:block`} />
          <Skeleton className={`${BAR} col-start-2 row-start-1 w-12 justify-self-end xl:col-start-6 xl:w-16`} />
        </div>
      ))}
    </div>
  );
}
