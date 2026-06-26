// Cold-start retry around fetchAyahsAudio. Render's free tier returns an empty
// ayahs[] (or 502) while it spins up, so the FIRST request after the page has
// been idle often comes back empty even though audio exists. Without this, the
// first tap shows a misleading "check your connection" and only works on the
// second try. We retry the empty result a few times with linear backoff before
// giving up.
//
// Pure-ish: the only side effect is `sleep`, which is injectable so tests drive
// it synchronously (no real timers). `fetchFn` is passed in (fetchAyahsAudio),
// which never throws — it returns { ayahs: [] } on any failure (see audio.js),
// so "empty" is the single retry signal.
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchAyahsWithRetry(
  fetchFn,
  keys,
  reciterId,
  { attempts = 4, delay = 500, step = 400, sleep = defaultSleep } = {}
) {
  let last = { reciterId, ayahs: [] }
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(delay + (i - 1) * step)
    last = await fetchFn(keys, reciterId)
    if (last && last.ayahs && last.ayahs.length) return last
  }
  return last
}
