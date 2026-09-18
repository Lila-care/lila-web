import type { PlanDto } from "@/api/checkout";
import { PageTitle } from "./CheckoutLayout";
import DiscountCodeField from "./DiscountCodeField";
import OrderTotals from "./OrderTotals";
import PaymentPanel from "./PaymentPanel";
import PaymentResult from "./PaymentResult";
import PlanSummaryCard from "./PlanSummaryCard";
import PromoOverrideNotice from "./PromoOverrideNotice";
import { useCheckout } from "./useCheckout";

interface CheckoutReadyProps {
  plan: PlanDto;
  announce: (message: string) => void;
}

// Mounted only once the plan is known, so the checkout hooks always have a plan to work with.
export default function CheckoutReady({ plan, announce }: CheckoutReadyProps) {
  const {
    discount,
    payment,
    handlePay,
    isCodeLocked,
    isPayingWithoutCode,
    promoOverride,
    totals,
  } = useCheckout(plan, announce);

  if (payment.result) {
    return (
      <PaymentResult
        result={payment.result}
        planName={plan.name}
        isConfirming={payment.status === "confirming"}
        onRetryConfirmation={payment.retryConfirmation}
      />
    );
  }

  return (
    <>
      <PageTitle />
      <div
        data-testid="checkout-grid"
        className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start"
      >
        <section aria-labelledby="summary-heading" className="min-w-0">
          <PlanSummaryCard
            plan={plan}
            codeField={
              <div className="flex flex-col gap-3">
                <DiscountCodeField
                  value={discount.input}
                  status={discount.status}
                  applied={discount.applied}
                  isLocked={isCodeLocked}
                  inputRef={discount.inputRef}
                  actionButtonRef={discount.actionButtonRef}
                  onChange={discount.changeInput}
                  onApply={discount.apply}
                  onRemove={discount.remove}
                />
                {promoOverride && (
                  <PromoOverrideNotice
                    withCodeInCents={promoOverride.withCodeInCents}
                    withoutCodeInCents={promoOverride.withoutCodeInCents}
                    isLocked={isCodeLocked}
                    onRemove={discount.remove}
                  />
                )}
              </div>
            }
            totals={
              <OrderTotals
                listInCents={totals.listInCents}
                discountInCents={totals.discountInCents}
                totalInCents={totals.totalInCents}
                discountLabel={
                  discount.applied
                    ? `Descuento ${discount.applied.code}`
                    : "Promoción"
                }
              />
            }
          />
        </section>
        <section
          aria-labelledby="payment-heading"
          className="min-w-0 lg:sticky lg:top-8"
        >
          <PaymentPanel
            listInCents={totals.listInCents}
            totalInCents={totals.totalInCents}
            payStatus={payment.status}
            widgetStatus={payment.widgetStatus}
            outcome={payment.outcome}
            isValidatingCode={discount.status === "validating"}
            isPayingWithoutCode={isPayingWithoutCode}
            payButtonRef={payment.payButtonRef}
            onPay={handlePay}
          />
        </section>
      </div>
    </>
  );
}
