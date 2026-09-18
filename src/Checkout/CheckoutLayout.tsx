import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface CheckoutLayoutProps {
  // Text for the single page-wide aria-live region.
  announcement: string;
  isBusy: boolean;
  children: ReactNode;
}

export function PageTitle() {
  return (
    <h1 className="mb-6 text-2xl font-bold text-text-primary md:text-[28px]">
      Finaliza tu compra
    </h1>
  );
}

// Focused flow: no Sidebar/MobileNav, just a way back to the chat.
export default function CheckoutLayout({
  announcement,
  isBusy,
  children,
}: CheckoutLayoutProps) {
  return (
    <div
      lang="es-CO"
      className="min-h-screen w-full bg-surface-brand-light font-poppins text-text-primary"
    >
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-4 pt-6 md:px-8">
        <Link
          href="/chat"
          className="inline-flex min-h-11 items-center gap-2 rounded-[12px] text-sm font-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-[3px] focus-visible:ring-ring/70"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al chat
        </Link>
        <img src="/lila-logo-warm.svg" alt="Lila" className="h-8 w-auto" />
      </header>

      <main
        aria-busy={isBusy}
        className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-10"
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="status-region"
          className="sr-only"
        >
          {announcement}
        </div>
        {children}
      </main>
    </div>
  );
}
