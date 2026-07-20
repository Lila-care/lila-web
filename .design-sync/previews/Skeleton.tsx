import { Skeleton } from "lila-web"

export function TableRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-12" />
    </div>
  )
}

export function DetailPanel() {
  return (
    <div className="max-w-md space-y-4">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
