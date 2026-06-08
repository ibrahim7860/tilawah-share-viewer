export const keyOf = (m) => `${m.surah}:${m.ayah}:${m.startWordIndex}:${m.endWordIndex}`

export function upsertMark(list, mark) {
  const k = keyOf(mark)
  const without = list.filter((x) => keyOf(x) !== k)
  return [...without, mark]
}

export function removeMark(list, key) {
  return list.filter((x) => keyOf(x) !== key)
}

/**
 * Apply an optimistic change via a functional updater; if apiCall rejects,
 * invert ONLY that change with another functional updater so concurrent edits
 * made in the meantime survive. `apply` and `revert` each take the current
 * state and return the next state.
 */
export async function applyWithRollback({ apply, revert, setState, apiCall, onError }) {
  setState(apply)
  try {
    await apiCall()
  } catch (e) {
    setState(revert)
    onError?.(e)
  }
}
