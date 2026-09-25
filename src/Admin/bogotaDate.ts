// Discount validity windows are Colombian calendar days (TL decision): written with a fixed
// America/Bogota offset (UTC-5, no DST) and read back with the same offset, independent of the
// admin's browser timezone. `<input type="date">` values ("YYYY-MM-DD") only cross into ISO
// timestamps here.
const BOGOTA_OFFSET = "-05:00";
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

export function toBogotaStartOfDay(dateInputValue: string): string {
  return `${dateInputValue}T00:00:00${BOGOTA_OFFSET}`;
}

export function toBogotaEndOfDay(dateInputValue: string): string {
  return `${dateInputValue}T23:59:59.999${BOGOTA_OFFSET}`;
}

// Shifted so the UTC getters return Bogotá wall-clock parts.
function toBogotaWallClock(isoString: string): Date {
  return new Date(new Date(isoString).getTime() + BOGOTA_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" for `<input type="date">`.
export function toBogotaDateInputValue(isoString: string): string {
  const date = toBogotaWallClock(isoString);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// "21/09" — padded by hand: es-CO's Intl output ignores `2-digit` and prints "1/1".
export function formatBogotaDayMonth(isoString: string): string {
  const date = toBogotaWallClock(isoString);
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`;
}
