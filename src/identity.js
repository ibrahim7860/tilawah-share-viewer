// Recipient identity for the edit changelog: a self-declared name, captured once
// and held in localStorage. No account, no device id — just a human-readable name
// attached to each edit so the owner knows who marked their Qur'an.
const KEY = 'share_editor_name'

export function getEditorName() {
  try {
    const v = localStorage.getItem(KEY)
    return v && v.trim() ? v : null
  } catch {
    return null
  }
}

// Trim + cap at 50 chars to match the backend's editorName validation. Returns
// the stored value (or null if blank). Tolerates private-mode localStorage throws.
export function setEditorName(name) {
  const t = (name ?? '').trim().slice(0, 50)
  try {
    if (t) localStorage.setItem(KEY, t)
  } catch {
    /* private mode: the name lives only in memory for this session */
  }
  return t || null
}
