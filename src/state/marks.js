export const keyOf = (m) => `${m.surah}:${m.ayah}:${m.startWordIndex}:${m.endWordIndex}`

export function upsertMark(list, mark) {
  const k = keyOf(mark)
  const without = list.filter((x) => keyOf(x) !== k)
  return [...without, mark]
}

export function removeMark(list, key) {
  return list.filter((x) => keyOf(x) !== key)
}

/** Apply `next` immediately; if apiCall rejects, restore `prev` and call onError. */
export async function applyWithRollback({ prev, next, setState, apiCall, onError }) {
  setState(next)
  try {
    await apiCall()
  } catch (e) {
    setState(prev)
    onError?.(e)
  }
}
