// Figma "missing-value" state (314:1261): an absent value renders as an em dash in secondary
// text instead of a fake zero or an empty cell.
export function MissingValue() {
  return (
    <span className="text-text-secondary" data-testid="missing-value">
      —
    </span>
  );
}
