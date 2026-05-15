// Module-level singleton: store a job ID that genre-transform should load on next focus.
// More reliable than URL params for cross-tab navigation in Expo Router.
let _pendingId: string | null = null;

export function setPendingResumeId(id: string): void { _pendingId = id; }
export function consumePendingResumeId(): string | null {
  const id = _pendingId;
  _pendingId = null;
  return id;
}
