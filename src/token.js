/** Read the share token from a URL fragment (defaults to window.location). */
export function readToken(href = window.location.href) {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return null
  const frag = href.slice(hashIndex + 1).trim()
  return frag.length > 0 ? frag : null
}
