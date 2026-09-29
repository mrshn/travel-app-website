// Every Markdown file in content/notes becomes a note in the app (bundled at build time).
import { parseNote, sortNotes } from '#shared/utils/notes'

const files = import.meta.glob('../../content/notes/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const NOTES = sortNotes(Object.entries(files).map(([path, raw]) => parseNote(raw, path.replace(/^(\.\.\/)+/, ''))))
