import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import Page from '../src/components/Page.jsx'
import { buildPageLayout, TOTAL_LINES } from '../src/quran/mushafLayout.js'

const loadPageData = (n) =>
  JSON.parse(readFileSync(resolve(process.cwd(), `public/pages/p${n}.json`), 'utf8'))

const noop = () => {}

// Short special pages (1–2) center their occupied lines vertically instead of
// leaving the lower 15-line grid blank (eng-review decision).
describe('Page — special-page vertical centering', () => {
  it('p1 renders only its occupied lines, centered', () => {
    const page = loadPageData(1)
    const lines = buildPageLayout(page, 1)
    expect(lines.length).toBeLessThan(TOTAL_LINES) // precondition: short page
    const { container } = render(
      <Page page={page} pageNumber={1} marks={[]} preview={null} onSelectWord={noop} />
    )
    const root = container.querySelector('.page')
    expect(root.classList.contains('page-centered')).toBe(true)
    expect(root.querySelectorAll('.mushaf-line')).toHaveLength(lines.length)
  })

  it('p3 (normal page) keeps the fixed 15-slot grid, not centered', () => {
    const page = loadPageData(3)
    const { container } = render(
      <Page page={page} pageNumber={3} marks={[]} preview={null} onSelectWord={noop} />
    )
    const root = container.querySelector('.page')
    expect(root.classList.contains('page-centered')).toBe(false)
    expect(root.querySelectorAll('.mushaf-line')).toHaveLength(TOTAL_LINES)
  })
})
