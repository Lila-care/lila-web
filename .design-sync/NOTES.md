# design-sync notes — lila-web

## Repo shape

lila-web is a Vite **application** (`package.json` is `private: true`, no `main`/`module`/`exports`),
not a published component library. There is no library `dist/` build to point `--entry` at.

- `cfg.shape = "package"`, synth-entry mode: `--entry ./dist/index.js` is passed even though that
  file never exists — it only anchors `PKG_DIR` to the repo root via the package.json walk-up in
  `package-build.mjs`. `resolveDistEntry` then soft-fails and `resolvePackage` synthesizes an entry
  from `cfg.srcDir` instead.
- Scope is intentionally narrowed to `src/components/ui/` (the 15 shadcn/ui-style primitives) via
  `cfg.srcDir` — the rest of `src/` (Admin, Calendario, Chat, Hoy, Perfil, AppShell, …) is
  feature/page code, not design-system primitives, and was excluded by explicit user choice.
- Every shadcn compound export (CardHeader, CardFooter, AlertDialogTrigger, TableRow,
  SelectItem, DropdownMenuItem, …) is excluded via `componentSrcMap: {"<Name>": null}` — there is
  no `.d.ts` tree here (no dist build) so the converter's automatic subcomponent-grouping
  (which relies on `dts.compounds`) never fires, and every one of these would otherwise surface
  as its own top-level card. Previews compose them inside their parent instead (per §4.2's
  "compose context-required pieces inside their parent" guidance).

## CSS

`cfg.cssEntry = "dist/styles.css"` — NOT `src/index.css` directly. Tailwind v4 requires the
`@tailwindcss/vite` plugin to actually compile `@import "tailwindcss"` into real utility CSS;
copying `src/index.css` verbatim would ship only the `:root` custom properties with none of the
utility classes (`flex`, `gap-2`, etc.) the components use. `dist/styles.css` is `yarn build`'s
compiled output, copied to a stable filename (Vite content-hashes the real asset name each build).

**Re-sync risk**: `dist/styles.css` is gitignored (dist/ is gitignored) and NOT regenerated
automatically — a re-sync must run `yarn build && cp dist/assets/index-*.css dist/styles.css`
again before `package-build.mjs`, or `cfg.cssEntry` will point at stale/missing CSS.

## Fonts

- `"DM Sans"` and `"Poppins"` are loaded via a Google Fonts `<link>` in `index.html` (not a local
  `@font-face`) — resolved via `cfg.runtimeFontPrefixes`, not `cfg.extraFonts` (there's no local
  file to ship; the design agent's output should assume these load at runtime the same way).
- `"Inter"` and `"Avenir"` in the `:root` font stack are accepted as system-font substitutes
  (user's explicit OK, 2026-07-20): Avenir is a macOS system font by design (no `@font-face`
  expected); Inter is a vestigial fallback-stack entry never actually loaded anywhere in the app.
- Render check was skipped for this sync (`--no-render-check`, user's explicit choice — no
  Playwright/Chromium cached locally and the user opted not to install it). Instead, every
  preview was visually verified manually via the Claude_Browser tool against the served
  `ds-bundle/` (see "Manual verification" below) — not the scripted `package-capture.mjs`
  grading loop, but real rendering was checked for all 15 components.

## Manual verification (no Playwright available)

Served `ds-bundle/` with `.ds-sync/storybook/http-serve.mjs` and opened each
`components/general/<Name>/<Name>.html` directly in the Claude_Browser tool. All 15 verified
rendering correctly (real brand colors/fonts, correct layout) except two pre-existing app bugs
(below, unrelated to design-sync authoring — do not "fix" by hacking the preview).

### FIXED 2026-07-20: unlayered vestigial `button{}` rule breaks small button-based controls

Wrapped in `@layer base` (`src/index.css`) while building the `Button` `cta` variant — that
variant's `rounded-xl`/`font-semibold`/custom padding were themselves getting clobbered by this
rule, which forced the fix from "flagged, not fixed" to "in scope." Checkbox/Collapsible previews
below **have not been re-verified against the new rendering yet** — do that before the next
design-sync re-sync. The original finding is kept below for context.

`src/index.css` has a leftover Vite-template block (`body{}`, `button{border-radius:8px;
padding:.6em 1.2em;...}`, the `@media (prefers-color-scheme: light)` block) that sits
**unlayered** — i.e. NOT wrapped in any `@layer` — while Tailwind v4's own Preflight reset
lives inside `@layer base`. Per CSS cascade-layer rules, unlayered author styles always beat
layered ones for competing properties, so `appearance: none`-equivalent normalization loses to
the browser's native button chrome for elements small enough that native intrinsic sizing wins
(confirmed independently of ds-bundle: a bare `<button class="size-4">` served with the real,
unmodified `dist/styles.css` computed to ~40×21px instead of 16×16px).

- **Checkbox** (Radix `Checkbox.Root` renders as a `<button>`, sized via `size-4`) renders as a
  native oval/pill instead of a small square in at least one Chromium-based engine.
- **Collapsible**'s trigger `<button>` gets unwanted `.6em 1.2em` padding pushing its content in.
- Real `Button` components are NOT visibly affected — their explicit `h-9`+ sizing already
  exceeds the native minimum, masking the bug there.
- Flagged to the user as a separate task (spawn_task, task_81aaba8e) — NOT fixed here, since
  design-sync must not modify component/app source. Previews for Checkbox/Collapsible ship
  as-is (faithful to current real rendering, per "ship what the customer already built").
  **Fixing that bug will change how these two previews render on the next rebuild** — re-verify
  them then.

### Preview-authoring fix: don't put shadcn `Button` as the child of an `asChild` Trigger

`DropdownMenuTrigger asChild><Button>...</Button></DropdownMenuTrigger>` broke Radix's Popper
positioning entirely (menu rendered at a fixed off-screen position, `position:static`) because
shadcn's `Button` is a plain function component, not `React.forwardRef` (same gotcha already
called out in `src/Admin/FormQuestionBuilder.tsx:38-40` for a different reason). When
`asChild`'s `Slot` tries to clone the trigger's ref onto `Button`, the ref never reaches the
real DOM node, so Radix has no anchor to measure. Fixed by using `buttonVariants({variant:
"outline"})` as a className on `DropdownMenuTrigger` directly instead of `asChild + Button`.
**Any other authored preview** (or real app code) that does `<XTrigger asChild><Button>`
for a Popper-positioned primitive (DropdownMenu, Popover, Tooltip, Select's future compositions)
will hit this same silent breakage — worth knowing project-wide, not just for this sync.

### Preview-authoring fix: Radix `Select`'s default `position="item-aligned"` didn't position statically

`SelectContent` defaulted to `position="item-aligned"` (aligns the selected item over the
trigger, a more complex calculation Radix does at open-time) and rendered at a disconnected,
wrong position when opened via `open` prop without real user interaction. Fixed by passing
`position="popper"` explicitly in the preview (a real, supported prop the component already
exposes) — resolved immediately and anchors correctly below the trigger.

## Known render warns

- `Checkbox` and `Collapsible` previews visually show the unlayered-`button{}` bug above — this
  is the CURRENT real rendering, not a preview defect. Re-check after that bug is fixed upstream.

## 2026-07-20 re-sync — token/font update

`src/index.css` got a substantial token pass this session: full 50–900 color ramps (plum,
orchid, cream, forest, coral), elevation shadows, spacing scale, `--radius-pill`, and a
typography scale. Two pre-existing shadcn semantic tokens were repointed (user's explicit
choice) rather than left alone:
- `--accent` (was `#f7f4ab` Vanilla Custard) → `var(--orchid-400)` `#AF87C0`.
- `--warning` (was `#ec7357` Burnt Peach) → `var(--coral-500)` `#E85331`; `--warning-foreground`
  stays dark text (`oklch(0.205 0 0)`) — coral-500 only hits 3.68:1 contrast with white text
  (fails WCAG AA) vs 5.39:1 with dark text (verified via a manual contrast calc, not shipped
  tooling).
- Body/`:root` font-family switched from `"DM Sans"`/`Inter` to `var(--font-family-base)`
  (`'Poppins', sans-serif`) — also the user's explicit choice. `conventions.md`'s Accent/Warning
  hex annotations and Fonts line were stale after this and have been corrected in place (no
  class/prop names changed, just the documented hex values and font list — see the diff in this
  sync). No component `.tsx` changed, so all 15 `sourceKeys` stayed identical — this was a
  styling-only re-sync (`upload: {components: [], styling: true}`).
- The new ramp/spacing/shadow/typography tokens (`--plum-*`, `--space-*`, `--shadow-*`,
  `--font-size-*`, `--font-weight-*`, `--radius-pill`, `--color-phase-*`, etc.) are NOT wired to
  any Tailwind utility class yet — they exist as raw CSS custom properties only. Nothing in
  `conventions.md`'s utility table references them since no component consumes them yet. If a
  future sync adds Tailwind `@theme` mappings for these, revisit the conventions table.

## Re-sync risks

- **`dist/styles.css` goes stale silently.** It's a manual copy of Vite's content-hashed build
  output (see "CSS" above) — nothing regenerates it automatically. A re-sync that skips
  `yarn build && cp dist/assets/index-*.css dist/styles.css` will build against whatever old
  CSS happens to be sitting there (or fail loudly if `dist/` was cleaned).
- **No Playwright/Chromium installed** — `package-validate.mjs`'s render check and
  `package-capture.mjs`'s grading have never run for this repo. Every "verified" claim in this
  sync came from manual Claude_Browser inspection of 1 story per component, not the scripted
  contact-sheet/grading loop. A re-sync should install Chromium if possible for a real automated
  gate, or repeat the manual browser pass — don't assume `_ds_sync.json`'s render hashes mean
  more than "the build was deterministic," since they were never cross-checked against actual
  screenshots by the tooling itself.
- **The unlayered `button{}` CSS bug** (see above) will change Checkbox/Collapsible's rendering
  the moment someone fixes `src/index.css` — re-verify those two previews specifically after
  that lands, don't assume they're still accurate.
- **componentSrcMap's ~50 `null` entries are name-based, not path-based** — if any shadcn
  subcomponent is renamed in a future shadcn/ui update (e.g. `CardAction` → something else),
  the old null entry becomes a no-op and the renamed export resurfaces as an unwanted top-level
  card. Check the component count (should stay 15) after any `src/components/ui/*.tsx` update.
- **Select/DropdownMenu previews depend on the `position="popper"` / no-asChild-Button
  workarounds above** — don't "simplify" them back to the more idiomatic-looking form without
  re-checking Popper positioning still resolves.
