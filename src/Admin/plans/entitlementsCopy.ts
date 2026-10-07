// "1 cambio sin guardar" / "3 cambios sin guardar" — footer summary of the plan panel.
export function describeUnsavedChanges(count: number): string {
  return `${count} ${count === 1 ? "cambio" : "cambios"} sin guardar`;
}
