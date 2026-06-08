/** Read the share token from a URL fragment (defaults to window.location). */
export function readToken(href = window.location.href) {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return null
  let frag = href.slice(hashIndex + 1).trim()
  // Strip anything after a subsequent `?` or `#` in the fragment.
  const cut = frag.search(/[?#]/)
  if (cut !== -1) frag = frag.slice(0, cut)
  if (frag.length === 0) return null
  try {
    return decodeURIComponent(frag)
  } catch {
    return frag
  }
}
