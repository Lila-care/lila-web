## lila-web conventions

**No wrapper needed.** These 15 components read design tokens from plain CSS custom properties
on `:root` — there is no `ThemeProvider`/context wrapper to mount. Just render components
directly; `styles.css` supplies the tokens globally.

**Gotcha — don't put `Button` as the child of an `asChild` trigger.** `Button` is a plain
function component, not `React.forwardRef`. Composition like
`<DropdownMenuTrigger asChild><Button>...</Button></DropdownMenuTrigger>` (or the same with
`PopoverTrigger`/`TooltipTrigger`) silently fails to attach the ref, breaking Radix's Popper
positioning entirely (the popover renders off-screen). For a styled trigger, put the classes
directly on the trigger instead: `<DropdownMenuTrigger className={buttonVariants({variant:
"outline"})}>`. `Button` itself is safe to use anywhere it is NOT the asChild target.

**Styling idiom: Tailwind v4 utility classes over CSS custom properties.** There is no separate
component prop API for color/spacing — every component is styled with `className` utilities
that resolve to the tokens below. Compose new UI the same way: Tailwind classes, not inline
styles or ad-hoc hex colors.

| Token role | Utility classes |
|---|---|
| Primary brand (deep magenta) | `bg-primary`, `text-primary-foreground`, `text-primary` |
| Secondary (light lavender) | `bg-secondary`, `text-secondary-foreground` |
| Accent (muted olive) | `bg-accent`, `text-accent-foreground` |
| Destructive (errors, delete) | `bg-destructive`, `text-destructive`, `border-destructive` |
| Muted text | `text-muted-foreground` |
| Card surface | `bg-card`, `text-card-foreground` |
| Popover/menu surface | `bg-popover`, `text-popover-foreground` |
| Borders / inputs / focus ring | `border-input`, `border-border`, `ring-ring` |
| Corner radius | `rounded-md` (default), `rounded-lg`, `rounded-xl` (cards) |

Semantic names only — never hardcode hex values; every color above is themeable via the
`:root` custom properties in `styles.css`.

**Where the truth lives.** Read `styles.css` (imports the token/font closure) and
`_ds_bundle.css` (the compiled Tailwind output) before styling anything new. Each component's
`.prompt.md` documents its own props from the real TypeScript source.

**Fonts.** Body/UI text loads "DM Sans" and "Poppins" from Google Fonts at runtime (not a
shipped `@font-face`) — assume they're available the same way in anything you build.

**Idiomatic snippet** (real composition, adapted from this sync's Card preview):

```tsx
import { Badge, Button, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "lila-web"

<Card className="w-96">
  <CardHeader>
    <CardTitle>Encuesta de bienestar</CardTitle>
    <CardDescription>Onboarding · v3</CardDescription>
    <CardAction><Badge>Publicado</Badge></CardAction>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">8 preguntas · onboarding.</p>
  </CardContent>
  <CardFooter className="gap-2 border-t">
    <Button variant="outline" size="sm">Editar</Button>
    <Button size="sm">Ver respuestas</Button>
  </CardFooter>
</Card>
```
