import { API_BASE } from './config.js'

// Curated Hafs reciter fallback — used only when the backend /reciters call
// fails. The backend response is the runtime source of truth (Amendment 5).
// API_BASE does NOT end in /api (config.js: '' in dev, the bare host in prod),
// so the /api prefix lives here, matching api.js's path convention.
const FALLBACK_RECITERS = [{ id: 7, name: 'Mishary Rashid Alafasy', style: 'Murattal' }]

// Fetch ayah audio by verse-key (NOT by page number). The backend's by_page is
// Madani-numbered (1-604), but viewer pages are per-edition (IndoPak runs
// 1-847), so a page-number fetch breaks IndoPak. verse_keys ("surah:ayah") are
// edition-agnostic, so this works for both. The caller passes the ORDERED,
// DISTINCT keys on the page; the backend returns the requested keys in order.
// Ayah audio is public Quran data; /api/quran/audio/** is permitAll and
// CORS-allowed for this origin (no share token). Never throws; [] on failure.
export async function fetchAyahsAudio(keys, reciterId = 7) {
  if (!keys || !keys.length) return { reciterId, ayahs: [] }
  try {
    const qs = `reciterId=${reciterId}&keys=${encodeURIComponent(keys.join(','))}`
    const r = await fetch(`${API_BASE}/api/quran/audio/ayahs?${qs}`)
    if (!r.ok) return { reciterId, ayahs: [] }
    return await r.json()
  } catch {
    return { reciterId, ayahs: [] }
  }
}

export async function fetchReciters() {
  try {
    const r = await fetch(`${API_BASE}/api/quran/audio/reciters`)
    if (!r.ok) return { reciters: FALLBACK_RECITERS, defaultReciterId: 7 }
    return await r.json()
  } catch {
    return { reciters: FALLBACK_RECITERS, defaultReciterId: 7 }
  }
}
