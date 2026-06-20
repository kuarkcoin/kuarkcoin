export function formatSignalTime(value: string | number | Date | null | undefined, now = new Date()): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return "az önce";
  if (diffMs >= 0 && diffMs < 60 * 60_000) return `${Math.floor(diffMs / 60_000)} dk önce`;
  if (diffMs >= 0 && diffMs < 24 * 60 * 60_000) return `${Math.floor(diffMs / (60 * 60_000))} saat önce`;

  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
