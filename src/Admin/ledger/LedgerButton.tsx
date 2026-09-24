import { ComponentProps } from "react";
import { Button, cn } from "@lila-care/design-system";

type LedgerButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size"
> & {
  tone?: "primary" | "secondary";
};

// The package's default Button carries a gradient, shadow and hover scale — none of which the
// Ledger allows. These overrides (merged by the package's own cn/tailwind-merge) keep the
// token colors and radius-lg (12px, Figma) and drop the rest. The label sits in its own span
// because the package's `text-sm font-medium` would otherwise fight the `type-*` utility.
export function LedgerButton({
  tone = "primary",
  type = "button",
  className,
  children,
  ...props
}: LedgerButtonProps) {
  return (
    <Button
      type={type}
      variant={tone === "primary" ? "default" : "secondary"}
      className={cn(
        "h-auto rounded-lg px-4 py-2 shadow-none hover:scale-100 hover:shadow-none active:scale-100",
        tone === "primary" && "bg-primary bg-none hover:bg-primary/90",
        className,
      )}
      {...props}
    >
      <span className="type-body-md-strong">{children}</span>
    </Button>
  );
}

type TextButtonProps = ComponentProps<"button">;

// Inline "Editar" / "Cargar más" / "Desactivar plan": a plain text link in primary — the
// Ledger's actions never get a boxed button inside a row.
export function TextButton({
  className,
  type = "button",
  ...props
}: TextButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "type-body-md text-primary underline-offset-2 hover:underline disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
