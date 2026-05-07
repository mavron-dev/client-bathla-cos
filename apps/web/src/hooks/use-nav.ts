'use client';

/**
 * Client-side hook for filtering navigation items based on user role
 *
 * This hook uses next-auth's useSession to check roles
 * without any server calls. This is perfect for navigation visibility (UX only).
 *
 * Note: For actual security (API routes, server actions), always use server-side checks.
 * This is only for UI visibility.
 */

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { NavItem } from '@/types';

/**
 * Hook to filter navigation items based on user role (fully client-side)
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered items based on user's role
 */
export function useFilteredNavItems(items: NavItem[]) {
  const { data: session } = useSession();

  const filteredItems = useMemo(() => {
    const userRole = session?.user?.role;

    return items
      .filter((item) => {
        // No access restrictions - show to everyone
        if (!item.access) {
          return true;
        }

        // Check role requirement
        if (item.access.role) {
          if (!userRole || userRole !== item.access.role) {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        // Recursively filter child items
        if (item.items && item.items.length > 0) {
          const filteredChildren = item.items.filter((childItem) => {
            if (!childItem.access) {
              return true;
            }

            if (childItem.access.role) {
              if (!userRole || userRole !== childItem.access.role) {
                return false;
              }
            }

            return true;
          });

          return {
            ...item,
            items: filteredChildren
          };
        }

        return item;
      });
  }, [items, session?.user?.role]);

  return filteredItems;
}
