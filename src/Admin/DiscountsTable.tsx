import { Loader2 } from "lucide-react";
import type { DiscountDto } from "@/api/discounts";
import { DiscountKindBadge, DiscountStatusBadge } from "@/Admin/DiscountBadges";
import {
  describeDiscount,
  formatDiscountValue,
  formatValidity,
} from "@/Admin/discountFormat";
import { Button, Card, DataTable } from "@lila-care/design-system";
import { cn } from "@/lib/utils";

export interface DiscountListProps {
  discounts: DiscountDto[];
  getPlanName: (planId: string) => string;
  busyDiscountId: string | null;
  onEdit: (discount: DiscountDto) => void;
  onToggleStatus: (discount: DiscountDto) => void;
}

interface RowActionsProps extends Omit<
  DiscountListProps,
  "discounts" | "busyDiscountId"
> {
  discount: DiscountDto;
  isBusy: boolean;
  size: "sm" | "lg";
  className?: string;
}

function DiscountRowActions({
  discount,
  getPlanName,
  isBusy,
  onEdit,
  onToggleStatus,
  size,
  className,
}: RowActionsProps) {
  const description = describeDiscount(discount, getPlanName(discount.planId));
  const isActive = discount.status === "active";
  const toggleLabel = isActive ? "Desactivar" : "Activar";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={isBusy}
        aria-label={`Editar ${description}`}
        onClick={() => onEdit(discount)}
        data-testid="discount-edit-button"
      >
        Editar
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={isBusy}
        aria-busy={isBusy}
        aria-label={`${toggleLabel} ${description}`}
        onClick={() => onToggleStatus(discount)}
        data-testid="discount-toggle-button"
      >
        {isBusy && <Loader2 className="animate-spin" aria-hidden="true" />}
        {toggleLabel}
      </Button>
    </div>
  );
}

// `DataTable` clips (it does not scroll) narrow tables, so it only renders from `lg`; below that
// the same rows render as cards. Both live in the DOM, hidden by CSS, hence distinct testids.
export function DiscountsTable(props: DiscountListProps) {
  const { discounts, getPlanName, busyDiscountId, onEdit, onToggleStatus } =
    props;
  return (
    <section aria-label="Lista de descuentos" className="hidden lg:block">
      <DataTable<DiscountDto>
        variant="admin"
        rows={discounts}
        keyExtractor={(row) => row.discountId}
        columns={[
          {
            key: "planId",
            header: "Plan",
            render: (_, row) => (
              <span
                data-testid="discount-row"
                className="font-medium break-words text-neutral-900"
              >
                {getPlanName(row.planId)}
              </span>
            ),
          },
          {
            key: "kind",
            header: "Aplicación",
            render: (_, row) => <DiscountKindBadge discount={row} />,
          },
          {
            key: "value",
            header: "Valor",
            render: (_, row) => (
              <span className="text-neutral-900 tabular-nums">
                {formatDiscountValue(row.valueType, row.value)}
              </span>
            ),
          },
          {
            key: "startsAt",
            header: "Vigencia",
            render: (_, row) => (
              <span className="whitespace-nowrap text-neutral-700">
                {formatValidity(row.startsAt, row.endsAt)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Estado",
            render: (_, row) => <DiscountStatusBadge discount={row} />,
          },
          {
            key: "discountId",
            header: "Acciones",
            render: (_, row) => (
              <DiscountRowActions
                discount={row}
                getPlanName={getPlanName}
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                isBusy={busyDiscountId === row.discountId}
                size="sm"
                className="whitespace-nowrap"
              />
            ),
          },
        ]}
      />
    </section>
  );
}

function DefinitionPair({
  term,
  children,
}: {
  term: string;
  children: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-600">{term}</dt>
      <dd className="text-sm break-words text-neutral-900">{children}</dd>
    </div>
  );
}

export function DiscountCardList(props: DiscountListProps) {
  const { discounts, getPlanName, busyDiscountId, onEdit, onToggleStatus } =
    props;
  return (
    <section
      aria-label="Lista de descuentos"
      className="flex flex-col gap-3 lg:hidden"
    >
      {discounts.map((discount) => (
        <Card
          key={discount.discountId}
          className="gap-3 p-4"
          data-testid="discount-card"
        >
          <div className="flex flex-wrap items-center gap-2">
            <DiscountKindBadge discount={discount} />
            <DiscountStatusBadge discount={discount} />
          </div>
          <p className="font-medium break-words text-neutral-900">
            {getPlanName(discount.planId)}
          </p>
          <dl className="grid grid-cols-2 gap-3">
            <DefinitionPair term="Valor">
              {formatDiscountValue(discount.valueType, discount.value)}
            </DefinitionPair>
            <DefinitionPair term="Vigencia">
              {formatValidity(discount.startsAt, discount.endsAt)}
            </DefinitionPair>
          </dl>
          <DiscountRowActions
            discount={discount}
            getPlanName={getPlanName}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            isBusy={busyDiscountId === discount.discountId}
            size="lg"
            className="[&>button]:flex-1"
          />
        </Card>
      ))}
    </section>
  );
}
