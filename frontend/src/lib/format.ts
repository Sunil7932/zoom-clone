/** Date/time formatting helpers for the dashboard and meeting cards. */

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** "Today, 3:30 PM" / "Tomorrow, 9:00 AM" / "Mon, Jun 24, 2:00 PM". */
export function formatMeetingTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = formatTime(iso);
  if (isSameDay(d, now)) return `Today, ${time}`;
  if (isSameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${DAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}, ${time}`;
}

/** Relative past time for recent meetings: "2 hours ago", "Yesterday". */
export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${MONTH[d.getMonth()]} ${d.getDate()}`;
}

/** Current wall clock for the meeting room header, e.g. "3:42 PM". */
export function nowClock(): string {
  return formatTime(new Date().toISOString());
}

export function todayLong(): string {
  const d = new Date();
  return `${DAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "1h 30m" / "45m" from a minutes count. */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
