const ISTANBUL_TZ = "Europe/Istanbul";

export function getIstanbulDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function istanbulDayRange(date = new Date()) {
  const day = getIstanbulDay(date);
  const startUTC = new Date(`${day}T00:00:00+03:00`);
  const endUTC = new Date(startUTC);
  endUTC.setUTCDate(endUTC.getUTCDate() + 1);

  return {
    day,
    startUTC,
    endUTC,
  };
}
