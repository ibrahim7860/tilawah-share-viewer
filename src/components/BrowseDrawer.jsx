import { useState } from 'react'
import Modal from './Modal.jsx'
import {
  SURAH_LIST, JUZ_LIST, surahStartPage, juzStartPage, parseJumpPage, surahForPage,
} from '../quran/nav.js'

/**
 * Full-Quran index, mirroring the in-app Quran tab: browse by Surah or Juz, or
 * jump straight to a page. Selecting anything navigates and closes the drawer.
 * Rendered through the shared Modal primitive (overlay/Escape/focus handling).
 *
 * All page numbers come from the active mushaf (`cfg`): the surah/juz tables and
 * total page count differ between Madani (604) and IndoPak (847), so a jump
 * lands on the right page for the owner's edition.
 *
 * @param {number} currentPage - page currently shown (to highlight where we are)
 * @param {object} cfg - quran/mushaf.js config for the active edition
 * @param {(page:number)=>void} onNavigate
 * @param {()=>void} onClose
 */
export default function BrowseDrawer({ currentPage, cfg, onNavigate, onClose }) {
  const [tab, setTab] = useState('surah') // surah | juz | page
  const [jump, setJump] = useState('')
  const [jumpError, setJumpError] = useState(false)
  const m = cfg.id
  const activeSurah = surahForPage(currentPage, m)

  const go = (page) => { if (page) { onNavigate(page); onClose() } }

  const submitJump = (e) => {
    e.preventDefault()
    const page = parseJumpPage(jump, m)
    if (page == null) { setJumpError(true); return }
    go(page)
  }

  return (
    <Modal onClose={onClose} label="Browse the Qur'an" cardClassName="drawer">
      <div className="drawer-tabs">
        <div role="tablist" aria-label="Browse by" className="drawer-tablist">
          <button role="tab" id="tab-surah" aria-controls="panel-surah" aria-selected={tab === 'surah'}
                  className={tab === 'surah' ? 'active' : ''} onClick={() => setTab('surah')}>Surah</button>
          <button role="tab" id="tab-juz" aria-controls="panel-juz" aria-selected={tab === 'juz'}
                  className={tab === 'juz' ? 'active' : ''} onClick={() => setTab('juz')}>Juz</button>
          <button role="tab" id="tab-page" aria-controls="panel-page" aria-selected={tab === 'page'}
                  className={tab === 'page' ? 'active' : ''} onClick={() => setTab('page')}>Page</button>
        </div>
        <button className="drawer-close" aria-label="Close" onClick={onClose}>✕</button>
      </div>

      {tab === 'surah' && (
        <ul className="drawer-list" id="panel-surah" role="tabpanel" aria-labelledby="tab-surah" aria-label="Surahs">
          {SURAH_LIST.map((s) => {
            const fp = surahStartPage(s.number, m)
            return (
              <li key={s.number}>
                <button className={s.number === activeSurah?.number ? 'drawer-row current' : 'drawer-row'}
                        onClick={() => go(fp)}>
                  <span className="drawer-num">{s.number}</span>
                  <span className="drawer-name" dir="rtl">{s.name}</span>
                  <span className="drawer-page">p.{fp}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'juz' && (
        <ul className="drawer-list" id="panel-juz" role="tabpanel" aria-labelledby="tab-juz" aria-label="Juz">
          {JUZ_LIST.map((j) => {
            const jp = juzStartPage(j.number, m)
            return (
              <li key={j.number}>
                <button className="drawer-row" onClick={() => go(jp)}>
                  <span className="drawer-num">{j.number}</span>
                  <span className="drawer-name" dir="rtl">{j.name}</span>
                  <span className="drawer-page">p.{jp}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'page' && (
        <form className="drawer-jump" id="panel-page" role="tabpanel" aria-labelledby="tab-page"
              onSubmit={submitJump} noValidate>
          <label htmlFor="jump-page">Go to page (1–{cfg.totalPages})</label>
          <div className="drawer-jump-row">
            <input id="jump-page" type="number" inputMode="numeric" min="1" max={cfg.totalPages}
                   value={jump} placeholder={String(currentPage)}
                   onChange={(e) => { setJump(e.target.value); setJumpError(false) }} />
            <button type="submit">Go</button>
          </div>
          {jumpError && <p className="drawer-jump-error" role="alert">Enter a page number.</p>}
        </form>
      )}
    </Modal>
  )
}
