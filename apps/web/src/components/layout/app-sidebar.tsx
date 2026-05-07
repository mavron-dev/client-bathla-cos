'use client';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';
import { useFilteredNavItems } from '@/hooks/use-nav';
import { useSession, signOut } from 'next-auth/react';
import {
  IconChevronRight,
  IconChevronsDown,
  IconLogout,
  IconUserCircle,
  IconUser,
  IconMail
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setOpenMobile, isMobile } = useSidebar();
  const filteredItems = useFilteredNavItems(navItems);
  const [profileOpen, setProfileOpen] = useState(false);

  const user = session?.user;
  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <>
      <Sidebar collapsible='icon'>
        <SidebarHeader>
          <div className='flex items-center gap-2 py-3 group-data-[collapsible=icon]:!p-0'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold'>
              B
            </div>
            <span className='font-semibold text-lg group-data-[collapsible=icon]:hidden'>
              Bathla COS
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent className='overflow-x-hidden'>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return item?.items && item?.items?.length > 0 ? (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className='group/collapsible'
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={pathname === item.url}
                        >
                          {item.icon && <Icon />}
                          <span>{item.title}</span>
                          <IconChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <Link
                                  href={subItem.url}
                                  onClick={() => isMobile && setOpenMobile(false)}
                                >
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Link
                        href={item.url}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size='lg'
                    className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                  >
                    <Avatar className='h-8 w-8 rounded-lg'>
                      <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                      <AvatarFallback className='rounded-lg'>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className='grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'>
                      <span className='truncate font-semibold'>{user?.name || 'User'}</span>
                      <span className='truncate text-xs text-muted-foreground'>
                        {user?.email || ''}
                      </span>
                    </div>
                    <IconChevronsDown className='ml-auto size-4 group-data-[collapsible=icon]:hidden' />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                  side='bottom'
                  align='end'
                  sideOffset={4}
                >
                  <DropdownMenuLabel className='p-0 font-normal'>
                    <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                      <Avatar className='h-8 w-8 rounded-lg'>
                        <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                        <AvatarFallback className='rounded-lg'>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div className='grid flex-1 text-left text-sm leading-tight'>
                        <span className='truncate font-semibold'>{user?.name || 'User'}</span>
                        <span className='truncate text-xs text-muted-foreground'>
                          {user?.role || 'user'}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                      <IconUserCircle className='mr-2 h-4 w-4' />
                      Profile
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                    <IconLogout className='mr-2 h-4 w-4' />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Profile</DialogTitle>
            <DialogDescription>
              Your account information
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Avatar */}
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
              <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>
            
            {/* User Details */}
            <div className="w-full space-y-4">
              {/* Name */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconUser className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{user?.name || 'Not provided'}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconMail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email || 'Not provided'}</p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="flex items-center justify-center pt-2">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full capitalize">
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
