import { DiscountDto } from "@/api/discounts";
import {
  formatDiscountCode,
  formatDiscountValue,
  formatValidityWindow,
  summarizeDiscount,
} from "@/Admin/plansFormat";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { DISCOUNTS_LEDGER_COLUMNS } from "@/Admin/ledger/ledgerColumns";
import {
  LedgerStatusText,
  ResponsiveLedgerRow,
} from "@/Admin/ledger/ResponsiveLedgerRow";
import { TextButton } from "@/Admin/ledger/LedgerButton";

export interface DiscountRow extends DiscountDto {
  planName: string;
}

function DiscountStatus({ row }: { row: DiscountRow }) {
  return (
    <LedgerStatusText tone={row.status === "active" ? "accent" : "muted"}>
      {row.status === "active" ? "Activo" : "Inactivo"}
    </LedgerStatusText>
  );
}

interface DiscountsLedgerProps {
  rows: DiscountRow[];
  onEdit: (discountId: string) => void;
}

export function DiscountsLedger({ rows, onEdit }: DiscountsLedgerProps) {
  return (
    <div className="min-w-0">
      <LedgerHeader
        className={`hidden gap-x-4 lg:grid ${DISCOUNTS_LEDGER_COLUMNS}`}
      >
        <span>Plan</span>
        <span>Código</span>
        <span>Valor</span>
        <span>Vigencia</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </LedgerHeader>
      <ul className="flex flex-col gap-3 lg:gap-0">
        {rows.map((row) => (
          <ResponsiveLedgerRow
            key={row.discountId}
            testId={`discount-row-${row.discountId}`}
            columnsClass={DISCOUNTS_LEDGER_COLUMNS}
            onOpen={() => onEdit(row.discountId)}
            stacked={{
              title: row.planName,
              status: <DiscountStatus row={row} />,
              summary: summarizeDiscount(row),
            }}
            cells={
              <>
                <span className="type-body-md min-w-0 break-words text-text-primary">
                  {row.planName}
                </span>
                <span className="type-body-md min-w-0 break-words text-text-primary">
                  {formatDiscountCode(row)}
                </span>
                <span className="type-body-md text-text-primary">
                  {formatDiscountValue(row)}
                </span>
                <span className="type-body-sm text-text-secondary">
                  {formatValidityWindow(row.startsAt, row.endsAt)}
                </span>
                <DiscountStatus row={row} />
                <span className="text-right">
                  <TextButton
                    onClick={() => onEdit(row.discountId)}
                    aria-label={`Editar descuento ${formatDiscountCode(row)} de ${row.planName}`}
                    data-testid={`discount-edit-${row.discountId}`}
                  >
                    Editar
                  </TextButton>
                </span>
              </>
            }
          />
        ))}
      </ul>
    </div>
  );
}
