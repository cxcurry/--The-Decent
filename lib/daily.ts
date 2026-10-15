export const TIME_ZONE = "America/New_York";
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function dayAt(time = Date.now()) {
  const parts = dayFormat.formatToParts(time);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function dayNumber(day: string) {
  return (
    Math.floor(
      (Date.parse(`${day}T00:00:00Z`) - Date.UTC(2026, 0, 1)) / 86400000,
    ) + 1
  );
}
export function setFor(day: string) {
  return (((dayNumber(day) - 1) % 7) + 7) % 7;
}
export function nextReset(time = Date.now()) {
  const tomorrow = new Date(Date.parse(`${dayAt(time)}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  const target = Date.parse(`${tomorrow}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = formatter.formatToParts(guess);
    const v = (type: string) => Number(p.find((x) => x.type === type)!.value);
    const local = Date.UTC(
      v("year"),
      v("month") - 1,
      v("day"),
      v("hour"),
      v("minute"),
      v("second"),
    );
    guess += target - local;
  }
  return guess;
}
