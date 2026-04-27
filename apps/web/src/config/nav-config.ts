import { NavItem } from '@/types'

/**
 * Navigation for the /admin role group (admin + developer).
 * Bathla COS Phase 2 placeholders — most pages don't exist yet.
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
    title: 'Jobs',
    url: '/admin/jobs',
    icon: 'robot',
    isActive: false,
    items: [],
  },
]
