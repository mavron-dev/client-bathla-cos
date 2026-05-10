import { NavItem } from '@/types'

/**
 * Navigation for the /executive role group (director + manager + member).
 * Phase 2 placeholders.
 */
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/executive',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [],
  },
  {
    title: 'My tasks',
    url: '/executive/tasks',
    icon: 'kanban',
    isActive: false,
    shortcut: ['t', 't'],
    items: [],
  },
  // My reminders — hidden until the /executive/reminders page ships. Restore this entry when the feature is ready.
  // {
  //   title: 'My reminders',
  //   url: '/executive/reminders',
  //   icon: 'messageCircle',
  //   isActive: false,
  //   shortcut: ['r', 'r'],
  //   items: [],
  // },
]
