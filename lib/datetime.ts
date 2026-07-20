// Kenya is UTC+3 year-round (no DST). Render everything in Africa/Nairobi so
// timestamps on the dashboard, tables and receipts read in local shop time.
// Uses the built-in Intl API with a fixed IANA zone — no extra dependency.
export const NAIROBI_TZ = "Africa/Nairobi"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type Parts = {
  year: string
  month: number // 0-indexed
  day: string
  hour: string
  minute: string
  weekday: number // 0=Sun
}

function nairobiParts(date: Date | string): Parts {
  const d = new Date(date)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: NAIROBI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  })
  const map: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) map[p.type] = p.value
  const weekdayIdx = DAYS.indexOf(map.weekday)
  return {
    year: map.year,
    month: Number(map.month) - 1,
    day: map.day,
    hour: map.hour === "24" ? "00" : map.hour,
    minute: map.minute,
    weekday: weekdayIdx,
  }
}

export function formatDateTime(date: Date | string): string {
  const p = nairobiParts(date)
  return `${p.day} ${MONTHS[p.month]} ${p.year}, ${p.hour}:${p.minute}`
}

export function formatDate(date: Date | string): string {
  const p = nairobiParts(date)
  return `${p.day} ${MONTHS[p.month]} ${p.year}`
}

export function formatTime(date: Date | string): string {
  const p = nairobiParts(date)
  return `${p.hour}:${p.minute}`
}

/** yyyy-MM-dd in Nairobi time — used as a grouping key for daily aggregates. */
export function formatDayKey(date: Date | string): string {
  const p = nairobiParts(date)
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${p.day}`
}

export function formatDayLabel(date: Date | string): string {
  const p = nairobiParts(date)
  return `${DAYS[p.weekday]} ${p.day} ${MONTHS[p.month]}`
}
