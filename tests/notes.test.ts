import { describe, expect, it } from 'vitest'
import { renderMarkdown, noteRoute } from '../shared/utils/markdown'
import { notesFor, parseFrontmatter, parseNote, sortNotes } from '../shared/utils/notes'

const raw = `---
title: "Rome: our planning chat"
date: 2026-09-30
kind: chat
trip: rome-2026-10   # the app's trip id
summary: How the plan came together
tags: [rome, chat, "first trip"]
---

# Rome: our planning chat

Hello **there**.
`

describe('notes', () => {
  it('reads front matter', () => {
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({ title: 'Rome: our planning chat', date: '2026-09-30', kind: 'chat', trip: 'rome-2026-10', summary: 'How the plan came together', tags: ['rome', 'chat', 'first trip'] })
    expect(body.trim().startsWith('# Rome')).toBe(true)
  })

  it('builds a note and drops a repeated title', () => {
    const n = parseNote(raw, 'content/notes/2026-09-30-rome-chat.md')
    expect(n).toMatchObject({ slug: '2026-09-30-rome-chat', kind: 'chat', trip: 'rome-2026-10', date: '2026-09-30' })
    expect(n.body.startsWith('Hello')).toBe(true)
  })

  it('falls back to the file name and first heading', () => {
    const n = parseNote('# Packing tips\n\nBring a power bank.', 'content/notes/2026-10-01-packing.md')
    expect(n).toMatchObject({ title: 'Packing tips', date: '2026-10-01', kind: 'note', tags: [] })
  })

  it('sorts newest first', () => {
    const a = parseNote('# A', 'content/notes/2026-01-01-a.md')
    const b = parseNote('# B', 'content/notes/2026-02-01-b.md')
    expect(sortNotes([a, b]).map(n => n.slug)).toEqual(['2026-02-01-b', '2026-01-01-a'])
  })

  it('lists for an account only the notes of trips it holds, and the notes of no trip (D43)', () => {
    const chat = parseNote(raw, 'content/notes/2026-09-30-rome-chat.md')
    const howTo = parseNote('---\nkind: tips\n---\n# How to', 'content/notes/2026-09-30-how-to.md')
    const lisbon = parseNote('---\ntrip: lisbon-2026-11\n---\n# Lisbon', 'content/notes/2026-09-30-lisbon.md')
    const all = [chat, howTo, lisbon]
    expect(notesFor(all, []).map(n => n.slug)).toEqual(['2026-09-30-how-to'])
    expect(notesFor(all, ['rome-2026-10']).map(n => n.slug)).toEqual(['2026-09-30-rome-chat', '2026-09-30-how-to'])
    expect(notesFor(all, new Set(['rome-2026-10', 'lisbon-2026-11']))).toHaveLength(3)
  })
})

describe('markdown', () => {
  it('renders headings with ids and a table of contents', () => {
    const { html, toc } = renderMarkdown('## Money & cards\n\ntext\n\n## Money & cards\n')
    expect(html).toContain('<h2 id="money-cards">')
    expect(html).toContain('<h2 id="money-cards-2">')
    expect(toc.map(t => t.id)).toEqual(['money-cards', 'money-cards-2'])
  })

  it('escapes raw HTML and drops unsafe links', () => {
    const { html } = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) and [ok](https://example.com)')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener">ok</a>')
  })

  it('links notes to each other', () => {
    expect(noteRoute('2026-09-28-rome-research.md')).toBe('/notes/2026-09-28-rome-research')
    expect(noteRoute('./x.md#money')).toBe('/notes/x#money')
    expect(renderMarkdown('[report](2026-09-28-rome-research.md)').html).toContain('data-to="/notes/2026-09-28-rome-research"')
  })
})
