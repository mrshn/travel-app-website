import { describe, expect, it } from 'vitest'
import { dueInfo, inlineMd, nb } from '../shared/utils/text'

describe('inline markdown', () => {
  it('renders bold and links', () => {
    expect(inlineMd('**Bring cash** and see [RA](https://ra.co/events/1).')).toBe('<strong>Bring cash</strong> and see <a href="https://ra.co/events/1" target="_blank" rel="noopener">RA</a>.')
    expect(inlineMd('Book at https://example.com/x.')).toBe('Book at <a href="https://example.com/x" target="_blank" rel="noopener">https://example.com/x</a>.')
  })

  it('escapes HTML so notes cannot inject markup', () => {
    expect(inlineMd('<img src=x onerror=alert(1)> & "q"')).toBe('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;')
    expect(inlineMd('[x](javascript:alert(1))')).toBe('[x](javascript:alert(1))')
  })
})

describe('due dates', () => {
  const today = '2026-09-29'
  it('flags what to do now, soon and later', () => {
    expect(dueInfo({ due: '2026-09-28', dueLabel: 'Now', asap: true }, today)).toEqual({ text: 'Do now', tone: 't-bad' })
    expect(dueInfo({ due: '2026-10-01', dueLabel: '1 Oct' }, today)).toEqual({ text: '1 Oct · in 2 days', tone: 't-warn' })
    expect(dueInfo({ due: '2026-10-07', dueLabel: 'By 7 Oct' }, today)).toEqual({ text: 'By 7 Oct · in 8 days', tone: 't-plain' })
    expect(dueInfo({ due: '2026-09-20', dueLabel: '20 Sep' }, today).tone).toBe('t-bad')
    expect(dueInfo({ due: null, dueLabel: 'Later' }, today)).toEqual({ text: 'Later', tone: 't-plain' })
  })

  it('keeps numbers and units together', () => {
    expect(nb('in 25 min')).toBe('in 25 min')
  })
})
