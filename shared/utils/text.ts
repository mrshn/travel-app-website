/** Small text helpers shared by the app and the tests. */
import { diffDays, fmtDate, fmtRelDay } from './time'

/** "31 min" with no line break between the number and the unit. */
export function nb(s: string): string {
  return s.replace(/(\d) (min|h|d|km|m)\b/g, '$1\u00A0$2')
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }

/** Safe inline markdown: **bold**, [links](https://…) and bare https:// links. Everything else is escaped. */
export function inlineMd(s: string): string {
  const e = s.replace(/[&<>"']/g, c => ESC[c]!)
  return e
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https:\/\/[^\s)<]+[^\s)<.,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
}

/** Due-date chip for a booking. */
export function dueInfo(b: { due: string | null, dueLabel: string, asap?: boolean }, today: string): { text: string, tone: string } {
  if (b.asap) return { text: 'Do now', tone: 't-bad' }
  if (!b.due) return { text: b.dueLabel || 'Any time', tone: 't-plain' }
  const n = diffDays(today, b.due)
  const label = b.dueLabel && b.dueLabel !== 'Now' ? b.dueLabel : fmtDate(b.due, 'dayMonth')
  if (n < 0) return { text: `${label} · overdue`, tone: 't-bad' }
  if (n === 0) return { text: `${label} · today`, tone: 't-warn' }
  if (n <= 3) return { text: `${label} · ${fmtRelDay(b.due, today)}`, tone: 't-warn' }
  return { text: `${label} · ${fmtRelDay(b.due, today)}`, tone: 't-plain' }
}
