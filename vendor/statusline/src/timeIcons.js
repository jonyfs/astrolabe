/**
 * How a reset moment reads to a human.
 *
 * Until 2026-09-06 this file also mapped a reset time onto one of Unicode's
 * 24 clock-face emoji, so the icon on the reset segment carried the hour
 * rather than decorating it. That segment is gone: each window now draws its
 * own reset beside its own level, and a face showing the absolute hour next
 * to a relative countdown said the same thing twice in two units, which was
 * a good part of why line 4 was hard to read. The faces went with it.
 *
 * There is still deliberately no attempt to encode the *day* in an emoji:
 * Unicode has no per-weekday or per-date glyph (📅 📆 🗓️ are generic), so the
 * weekday is rendered as text next to the calendar icon rather than faked
 * with a symbol that does not mean what it appears to.
 */

// Lowercase: the words the bar writes itself share one casing (specs/044).
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * How the reset moment reads to a human: the weekday when it lands on a
 * different day than today ("Mon 09:00"), or just the time when it's
 * still today ("09:00"). Naming a weekday that is in fact today would
 * make an imminent reset look further away than it is.
 */
export function resetMomentLabel(resetsAtSeconds, now = new Date()) {
  if (typeof resetsAtSeconds !== "number") return null;
  const d = new Date(resetsAtSeconds * 1000);
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) return hhmm;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  if (isTomorrow) return `tmrw ${hhmm}`;

  // A weekday name only identifies a day inside the coming week. Seven days
  // out it is today's own name, which reads as today and makes a reset a
  // week away look imminent. Past six days the date says it instead.
  const daysAhead = Math.floor((d - now) / (24 * 60 * 60 * 1000));
  if (daysAhead >= 6) {
    // The month is spelled, because `05/09` is 5 September to one reader and
    // 9 May to another (specs/047-time-reset).
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  return `${WEEKDAYS[d.getDay()]} ${hhmm}`;
}
