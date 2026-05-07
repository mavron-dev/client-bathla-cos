import { NavItem } from '@/types'

/**
 * Navigation for the /admin role group (admin + developer).
 * Bathla COS Phase 2 — sections marked "(soon)" are placeholders for the
 * upcoming dashboard waves; their pages don't exist yet.
 */
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [],
  },
  {
    title: 'Conversations',
    url: '/admin/conversations',
    icon: 'messages',
    isActive: false,
    shortcut: ['c', 'c'],
    items: [],
  },
  {
    title: 'Analytics',
    url: '/admin/analytics',
    icon: 'chart',
    isActive: false,
    shortcut: ['a', 'a'],
    items: [],
  },
  {
    title: 'Tasks',
    url: '/admin/tasks',
    icon: 'kanban',
    isActive: false,
    shortcut: ['t', 't'],
    items: [],
  },
  {
    title: 'Reminders',
    url: '/admin/reminders',
    icon: 'messageCircle',
    isActive: false,
    shortcut: ['r', 'r'],
    items: [],
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: 'users',
    isActive: false,
    shortcut: ['u', 'u'],
    items: [],
  },
  {
    title: 'Observability',
    url: '/admin/observability',
    icon: 'activity',
    isActive: false,
    shortcut: ['o', 'o'],
    items: [],
  },
  {
    title: 'Jobs',
    url: '/admin/jobs',
    icon: 'robot',
    isActive: false,
    items: [],
  },
]
