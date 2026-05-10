/**
 * Shared URL-state helper for the Jobs page filter bar / pagination.
 * Mirrors the inline pattern in audit-log-filter-bar.tsx but adds support for
 * multi-value params (type[], status[]) which the type / status filters need.
 *
 * Set a key to an array to write multiple values; pass `null` / `''` to
 * delete. Calling code is responsible for `router.replace` / `router.push`.
 */
export function patchSearchParams(
  sp: URLSearchParams,
  patch: Record<string, string | string[] | null | undefined>,
  options: { resetPage?: boolean } = {},
): URLSearchParams {
  const { resetPage = true } = options
  const next = new URLSearchParams(sp.toString())
  for (const [k, v] of Object.entries(patch)) {
    next.delete(k)
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      for (const vv of v) {
        if (vv) next.append(k, vv)
      }
    } else {
      next.set(k, v)
    }
  }
  if (resetPage) next.delete('page')
  return next
}

export function searchParamsToString(sp: URLSearchParams): string {
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}
