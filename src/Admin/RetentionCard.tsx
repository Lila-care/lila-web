import { Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RetentionCardProps {
  newUsersInRange: number;
  returned: number;
  rate: number; // fraction 0-1 — BE computes `returned / newUsersInRange`
}

export function RetentionCard({
  newUsersInRange,
  returned,
  rate,
}: RetentionCardProps) {
  const percent = Math.round(rate * 100);

  return (
    <Card className="flex h-full flex-col" data-testid="retention-card">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Repeat className="size-5 text-primary" aria-hidden="true" />
        <CardTitle className="text-sm font-medium text-neutral-600">
          Retención
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Retención de usuarias nuevas"
          className="h-3 w-full rounded-full bg-[var(--plum-100)]"
          data-testid="retention-meter"
        >
          <div
            className="h-3 rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p
          className="mt-3 text-3xl font-semibold text-neutral-900"
          data-testid="retention-value"
        >
          {percent}%
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          {newUsersInRange === 0
            ? "Sin usuarias nuevas en este rango"
            : `${returned} de ${newUsersInRange} usuarias nuevas volvieron a interactuar`}
        </p>
      </CardContent>
    </Card>
  );
}
