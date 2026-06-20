import { API_BASE } from './config.js'

// Curated Hafs reciter fallback — used only when the backend /reciters call
// fails. The backend response is the runtime source of truth (Amendment 5).
// API_BASE does NOT end in /api (config.js: '' in dev, the bare host in prod),
// so the /api prefix lives here, matching api.js's path convention.
const FALLBACK_RECITERS = [{ id: 7, name: 'Mishary Rashid Alafasy', style: 'Murattal' }]

// Ayah audio is public Quran data; the /api/quran/audio/** endpoint is permitAll and
// CORS-allowed for this origin (no share token needed). Never throws; returns [] on failure.
export async function fetchPageAudio(pageNumber, reciterId = 7) {
  try {
    const r = await fetch(`${API_BASE}/api/quran/audio/page/${pageNumber}?reciterId=${reciterId}`)
    if (!r.ok) return { pageNumber, reciterId, ayahs: [] }
    return await r.json()
  } catch {
    return { pageNumber, reciterId, ayahs: [] }
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
