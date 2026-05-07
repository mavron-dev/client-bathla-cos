/**
 * Coerce an unknown form-field value (could be Date, ISO string, or null) into
 * a Date or undefined. Used by the dialog forms because zod's `z.coerce.date()`
 * has an `unknown` input type, so RHF's `field.value` arrives untyped.
 */
export function asDate(v: unknown): Date | undefined {
  if (v === null || v === undefined || v === '') return undefined
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}
