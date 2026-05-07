import type { UserRole, LanguagePref } from '@bathla-cos/database'
import type { PublicUser, UserProfilePayload } from '@/server/users/service'

export type { PublicUser, UserProfilePayload }
export type UserListRow = PublicUser

export type UserStatusFilter = 'all' | 'active' | 'inactive'

export type UserRoleMeta = {
  id: UserRole
  label: string
  // Tailwind classes for the badge on table rows / detail header.
  badgeClass: string
}

export const USER_ROLE_META: Record<UserRole, UserRoleMeta> = {
  developer: {
    id: 'developer',
    label: 'Developer',
    badgeClass:
      'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    badgeClass:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300',
  },
  director: {
    id: 'director',
    label: 'Director',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
  },
  manager: {
    id: 'manager',
    label: 'Manager',
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
  },
  member: {
    id: 'member',
    label: 'Member',
    badgeClass:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
  },
}

export const LANGUAGE_LABELS: Record<LanguagePref, string> = {
  english: 'English',
  hindi: 'Hindi',
  hinglish: 'Hinglish',
}
