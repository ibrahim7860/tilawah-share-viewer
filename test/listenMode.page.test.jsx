import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import Page from '../src/components/Page.jsx'

const loadPageData = (n) =>
  JSON.parse(readFileSync(resolve(process.cwd(), `public/pages/p${n}.json`), 'utf8'))

const base = {
  page: loadPageData(3),
  pageNumber: 3,
  marks: [],
  preview: null,
}

describe('Page — Listen-mode tap routing', () => {
  it('outside listen mode, a word click MARKS (onSelectWord), never plays', () => {
    const onSelectWord = vi.fn(); const onPlayWord = vi.fn()
    const { container } = render(
      <Page {...base} listenMode={false} wasSwipe={() => false}
        onSelectWord={onSelectWord} onPlayWord={onPlayWord} />
    )
    fireEvent.click(container.querySelector('.word'))
    expect(onSelectWord).toHaveBeenCalledTimes(1)
    expect(onPlayWord).not.toHaveBeenCalled()
  })

  it('in listen mode, a word click PLAYS (onPlayWord), never marks', () => {
    const onSelectWord = vi.fn(); const onPlayWord = vi.fn()
    const { container } = render(
      <Page {...base} listenMode wasSwipe={() => false}
        onSelectWord={onSelectWord} onPlayWord={onPlayWord} />
    )
    fireEvent.click(container.querySelector('.word'))
    expect(onPlayWord).toHaveBeenCalledTimes(1)
    expect(onSelectWord).not.toHaveBeenCalled()
  })

  it('a recent swipe swallows the click in BOTH modes (no mark, no play)', () => {
    for (const listenMode of [false, true]) {
      const onSelectWord = vi.fn(); const onPlayWord = vi.fn()
      const { container } = render(
        <Page {...base} listenMode={listenMode} wasSwipe={() => true}
          onSelectWord={onSelectWord} onPlayWord={onPlayWord} />
      )
      fireEvent.click(container.querySelector('.word'))
      expect(onSelectWord, `mode=${listenMode}`).not.toHaveBeenCalled()
      expect(onPlayWord, `mode=${listenMode}`).not.toHaveBeenCalled()
    }
  })
})
