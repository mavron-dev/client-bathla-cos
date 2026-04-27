'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// Route mapping for readable breadcrumb titles
const routeMapping: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  leads: 'Leads',
  clients: 'Clients',
  plans: 'Plans',
  memberships: 'Memberships',
  payments: 'Payments',
  profile: 'Profile',
  settings: 'Settings',
  overview: 'Overview'
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Split pathname and filter empty segments
    const segments = pathname.split('/').filter(Boolean);

    // Build breadcrumb items
    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      
      // Get readable title from mapping or capitalize the segment
      const title = routeMapping[segment] || 
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      items.push({
        title,
        link: currentPath
      });
    });

    return items;
  }, [pathname]);

  return breadcrumbs;
}
