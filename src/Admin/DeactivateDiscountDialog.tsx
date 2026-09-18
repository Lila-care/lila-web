import { useState } from "react";
import { AlertDialog } from "radix-ui";
import { Loader2 } from "lucide-react";
import type { DiscountDto } from "@/api/discounts";
import { summarizeDiscount } from "@/Admin/discountFormat";
import { Button } from "@lila-care/design-system";

interface DeactivateDiscountDialogProps {
  discount: DiscountDto;
  planName: string;
  // Must not throw: the parent reports failures itself and closes this dialog.
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function consequenceText(discount: DiscountDto, planName: string): string {
  const preserved = "Las compras ya realizadas conservan su descuento.";
  return discount.kind === "static"
    ? `Dejará de aplicarse automáticamente a las compras del plan ${planName}. ${preserved}`
    : `El código ${discount.code} dejará de funcionar al pagar. ${preserved}`;
}

export function DeactivateDiscountDialog({
  discount,
  planName,
  onConfirm,
  onCancel,
}: DeactivateDiscountDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
  };

  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <AlertDialog.Content
          data-testid="discount-deactivate-dialog"
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl bg-background p-6 shadow-xl outline-none"
        >
          <AlertDialog.Title className="text-lg font-semibold text-neutral-900">
            ¿Desactivar este descuento?
          </AlertDialog.Title>
          <p className="text-sm font-medium break-words text-neutral-900">
            {summarizeDiscount(discount, planName)}
          </p>
          <AlertDialog.Description className="text-sm text-neutral-600">
            {consequenceText(discount, planName)}
          </AlertDialog.Description>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                disabled={busy}
                data-testid="discount-deactivate-cancel"
              >
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={busy}
              aria-busy={busy}
              onClick={handleConfirm}
              data-testid="discount-deactivate-confirm"
            >
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? "Desactivando…" : "Sí, desactivar"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
