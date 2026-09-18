import type { CheckoutQuoteDto } from "@/api/checkout";

export type CodeFieldStatus =
  | "idle"
  | "validating"
  | "valid"
  | "invalid"
  | "expired"
  | "below_minimum"
  | "unavailable"
  // Text typed but never applied when the user pressed "Pagar".
  | "unsaved";

// Display-only snapshot of a validated code. The quote's `reference`/`signature` are
// deliberately dropped: a quote must never be reused to open the widget.
export interface AppliedDiscount {
  code: string;
  discountInCents: number;
  amountInCents: CheckoutQuoteDto["amountInCents"];
}

export type PayStatus = "idle" | "opening" | "widget_open" | "confirming";

export type PaymentOutcome =
  | "declined"
  | "closed"
  | "widget_unavailable"
  | "quote_failed"
  | "total_changed";

export type PaymentResultKind = "approved" | "pending" | "confirm_failed";

export interface PaymentResult {
  kind: PaymentResultKind;
  transactionId: string;
  amountInCents: number;
  code: string | null;
}

// What Wompi's WidgetCheckout is opened with (values come straight from the quote).
export interface WidgetCheckoutParams {
  currency: "COP";
  amountInCents: number;
  reference: string;
  publicKey: string;
  signature: { integrity: string };
}

export type WidgetTransactionStatus =
  | "APPROVED"
  | "DECLINED"
  | "VOIDED"
  | "ERROR"
  | "PENDING";

export interface WidgetResult {
  // Absent when the user closes the widget without paying.
  transaction?: { id: string; status: WidgetTransactionStatus };
}
