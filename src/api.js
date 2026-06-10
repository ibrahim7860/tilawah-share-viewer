import { API_BASE } from './config.js'

function req(method, path, token, body) {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'X-Share-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export class RevokedError extends Error {}

export async function fetchMeta(token) {
  const r = await req('GET', '/api/share/view', token)
  if (r.status === 404) throw new RevokedError()
  if (!r.ok) throw new Error(`meta ${r.status}`)
  return r.json() // { ownerDisplayName, startPage, mushafPref }
}

export async function fetchMistakes(token) {
  const r = await req('GET', '/api/share/view/mistakes', token)
  if (r.status === 404) throw new RevokedError()
  if (!r.ok) throw new Error(`mistakes ${r.status}`)
  return r.json()
}

async function okJson(p) {
  const r = await p
  if (r.status === 404) throw new RevokedError()
  if (!r.ok) throw new Error(`write ${r.status}`)
  return r.json()
}
export const addMistake = (token, mark) => okJson(req('POST', '/api/share/view/mistakes', token, mark))
export const updateMistake = (token, mark) => okJson(req('PUT', '/api/share/view/mistakes', token, mark))
export const deleteMistake = (token, mark) => okJson(req('DELETE', '/api/share/view/mistakes', token, mark))

// Fire-and-forget page-view ping: lets the backend count this sitting as a
// "session" for the link owner. Must never throw into or block the caller —
// a slow/failing backend cannot be allowed to affect the viewer UX, so all
// errors (network and non-2xx) are swallowed. Returns a promise that always
// resolves; callers don't await it.
export const reportActivity = (token, page) =>
  req('POST', '/api/share/view/activity', token, { page }).then(() => {}, () => {})
