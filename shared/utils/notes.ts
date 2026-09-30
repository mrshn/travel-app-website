/** Notes saved from chats (research, tips, chat logs) as Markdown files with a small front matter. */

export const NOTE_KINDS = ['chat', 'research', 'tips', 'note', 'page'] as const
export type NoteKind = typeof NOTE_KINDS[number]

export interface Note {
  /** From the file name: content/notes/2026-09-30-rome-chat.md → 2026-09-30-rome-chat */
  slug: string
  /** Path in the repo, e.g. content/notes/2026-09-30-rome-chat.md */
  file: string
  title: string
  /** YYYY-MM-DD */
  date: string
  kind: NoteKind
  /** Trip id in the app, when the note belongs to a trip. */
  trip?: string
  summary?: string
  tags: string[]
  /** For kind "page": a page on the site (relative) or a full URL. */
  link?: string
  body: string
}

type FrontValue = string | string[]

function unquote(v: string): string {
  const t = v.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('\'') && t.endsWith('\''))) return t.slice(1, -1)
  return t
}

/** Reads a leading `---` block of `key: value` lines (values may be "quoted" or [lists]). */
export function parseFrontmatter(raw: string): { data: Record<string, FrontValue>, body: string } {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  if (!text.startsWith('---\n')) return { data: {}, body: text }
  const end = text.indexOf('\n---', 4)
  if (end < 0) return { data: {}, body: text }
  const head = text.slice(4, end)
  const after = text.slice(end + 4)
  const body = after.replace(/^[^\n]*\n/, '')
  const data: Record<string, FrontValue> = {}
  for (const line of head.split('\n')) {
    const m = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (!m) continue
    let v = m[2]!.trim()
    if (!v.startsWith('"') && !v.startsWith('\'')) v = v.replace(/\s+#.*$/, '')
    if (v.startsWith('[') && v.endsWith(']')) {
      data[m[1]!] = v.slice(1, -1).split(',').map(x => unquote(x)).filter(Boolean)
    }
    else {
      data[m[1]!] = unquote(v)
    }
  }
  return { data, body }
}

const str = (v: FrontValue | undefined) => (Array.isArray(v) ? v.join(', ') : v ?? '').trim()

export function parseNote(raw: string, file: string): Note {
  const { data, body } = parseFrontmatter(raw)
  const base = file.split('/').pop()!.replace(/\.md$/i, '')
  const dated = /^(\d{4}-\d{2}-\d{2})/.exec(base)?.[1] ?? ''
  const h1 = /^#\s+(.+)$/m.exec(body)?.[1]?.trim()
  const title = str(data.title) || h1 || base
  let text = body.replace(/^\s+/, '')
  // Drop a leading "# Title" that repeats the title.
  if (h1 && text.startsWith(`# ${h1}`) && h1 === title) text = text.slice(h1.length + 2).replace(/^\s+/, '')
  const kind = (NOTE_KINDS as readonly string[]).includes(str(data.kind)) ? str(data.kind) as NoteKind : 'note'
  const tags = Array.isArray(data.tags) ? data.tags : str(data.tags) ? str(data.tags).split(',').map(x => x.trim()).filter(Boolean) : []
  return {
    slug: base,
    file,
    title,
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(data.date)) ? str(data.date) : dated,
    kind,
    trip: str(data.trip) || undefined,
    summary: str(data.summary) || undefined,
    tags,
    link: str(data.link) || undefined,
    body: text,
  }
}

/** Newest first. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}

/**
 * The notes an account's lists show (spec D43): the notes of the trips it holds, and the notes that belong to no trip
 * (the how-to). Another trip's notes (its research, its planning chat) stay out of an account that doesn't have it.
 */
export function notesFor(notes: readonly Note[], tripIds: Iterable<string>): Note[] {
  const held = new Set(tripIds)
  return notes.filter(n => !n.trip || held.has(n.trip))
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'section'
}
