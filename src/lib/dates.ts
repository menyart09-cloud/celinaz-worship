// Dates are stored as ISO ("YYYY-MM-DD") in the DB but displayed/typed the way
// the owner's spreadsheet used them: "m-d-yy", no leading zeros.

export function isoToMdy(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${m}-${d}-${String(y).slice(-2)}`;
}

export function mdyToIso(mdy: string): string {
  const [m, d, y] = mdy.split("-").map(Number);
  const year = y < 100 ? 2000 + y : y;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
