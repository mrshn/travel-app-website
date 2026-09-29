/** Markdown → safe HTML for notes. Raw HTML is shown as text; only web, mail and phone links are kept. */
import { Marked, type Tokens } from 'marked'
import { headingId } from './notes'

export interface TocEntry {
  id: string
  text: string
  depth: number
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ESC[c]!)

function plain(tokens: Tokens.Generic[] | undefined, fallback: string): string {
  if (!tokens?.length) return fallback
  return tokens.map(t => ('tokens' in t && Array.isArray(t.tokens) ? plain(t.tokens as Tokens.Generic[], String(t.text ?? '')) : String(t.text ?? t.raw ?? ''))).join('')
}

/** Link to another note (foo.md / ./foo.md / notes/foo) → the app's note route. */
export function noteRoute(href: string): string | null {
  const m = /^(?:\.\/|\/?(?:content\/)?notes\/)?([\w.-]+)\.md(#[\w-]+)?$/i.exec(href)
  return m ? `/notes/${m[1]}${m[2] ?? ''}` : null
}

export function renderMarkdown(src: string): { html: string, toc: TocEntry[] } {
  const toc: TocEntry[] = []
  const used = new Map<string, number>()
  const md = new Marked({ gfm: true, breaks: false })
  md.use({
    renderer: {
      html({ text }) {
        return esc(text)
      },
      heading({ tokens, depth, text }) {
        const label = plain(tokens as Tokens.Generic[], text)
        let id = headingId(label)
        const n = used.get(id) ?? 0
        used.set(id, n + 1)
        if (n) id = `${id}-${n + 1}`
        if (depth <= 3) toc.push({ id, text: label, depth })
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens)
        const to = noteRoute(href)
        if (to) return `<a href="#" data-to="${esc(to)}">${inner}</a>`
        if (/^#[\w-]+$/.test(href)) return `<a href="${esc(href)}">${inner}</a>`
        if (!/^(https?:|mailto:|tel:)/i.test(href)) return inner
        const t = title ? ` title="${esc(title)}"` : ''
        return /^https?:/i.test(href) ? `<a href="${esc(href)}"${t} target="_blank" rel="noopener">${inner}</a>` : `<a href="${esc(href)}"${t}>${inner}</a>`
      },
      image({ href, title, text }) {
        if (!/^https:\/\//i.test(href)) return esc(text)
        return `<img src="${esc(href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy">`
      },
    },
  })
  const html = md.parse(src, { async: false }) as string
  return { html, toc }
}
