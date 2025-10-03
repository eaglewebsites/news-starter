// lib/datetime.js
import 'server-only'

/**
 * Minimal time zone formatter wrapper (works on server runtime too).
 */
export function formatInTimeZone(dateLike, timeZone, fmt = 'MMMM d, yyyy • h:mm a z') {
  const d = new Date(dateLike)
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(d)
  } catch {
    return d.toLocaleString('en-US')
  }
}
