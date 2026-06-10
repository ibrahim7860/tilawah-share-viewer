/**
 * Whether a page-ping's mistake snapshot is safe to apply as authoritative
 * server state.
 *
 * The activity ping returns the owner's full mistake set, but that snapshot is
 * taken on the server and can race local optimistic writes. It is safe to apply
 * only when:
 *   - no local write is in flight (`pending === 0`), and
 *   - no local write started since the ping was sent (`seqAtSend === seqNow`).
 * Otherwise we skip this round; the next page-flip ping reconciles, so the
 * viewer is eventually consistent and never clobbers an in-flight local mark.
 */
export function canApplySnapshot({ pending, seqAtSend, seqNow }) {
  return pending === 0 && seqAtSend === seqNow
}
