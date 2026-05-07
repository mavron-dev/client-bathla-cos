import { z } from 'zod'
import { UserRole, LanguagePref } from '@bathla-cos/database'

/**
 * Shared zod schemas for the Users feature.
 *
 * Both the admin dashboard dialog forms and the API route handlers import
 * from this file, so the create / update contracts are enforced in one place.
 * The Prisma enums are re-asserted with `satisfies` so this file fails to
 * compile if a UserRole or LanguagePref value is added or removed in the
 * schema without an accompanying update here.
 */

export const userRoleValues = [
  'developer',
  'admin',
  'director',
  'manager',
  'member',
] as const satisfies readonly UserRole[]

export const languagePrefValues = [
  'english',
  'hindi',
  'hinglish',
] as const satisfies readonly LanguagePref[]

export const userRoleSchema = z.enum(userRoleValues)
export const languagePrefSchema = z.enum(languagePrefValues)

const e164 = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Phone must be E.164-ish, e.g. +919876543210')

/**
 * Fields that any caller — including the 11Labs voice agent and a non-admin
 * user editing their own profile — is allowed to set on PATCH. Anything not
 * in this allow-list is rejected when the caller is not admin/dev.
 */
export const userPrefsSchema = z.object({
  languagePref: languagePrefSchema.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  voiceReplyEnabled: z.boolean().optional(),
})
export const USER_PREFS_FIELDS = [
  'languagePref',
  'timezone',
  'voiceReplyEnabled',
] as const

/**
 * Fields admin/dev can change on PATCH. Excludes id, email, createdAt,
 * updatedAt, optedInAt — those are server-managed or auth-bound.
 */
export const userAdminUpdateSchema = userPrefsSchema.extend({
  displayName: z.string().trim().min(1).max(120).optional(),
  phoneE164: e164.optional(),
  role: userRoleSchema.optional(),
  teamId: z.string().uuid().nullable().optional(),
  image: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(1).max(120),
  phoneE164: e164,
  role: userRoleSchema.default('member'),
  teamId: z.string().uuid().nullable().optional(),
  languagePref: languagePrefSchema.default('hinglish'),
  timezone: z.string().trim().min(1).max(64).default('Asia/Kolkata'),
  voiceReplyEnabled: z.boolean().default(true),
  image: z.string().url().nullable().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UserAdminUpdateInput = z.infer<typeof userAdminUpdateSchema>
export type UserPrefsInput = z.infer<typeof userPrefsSchema>
