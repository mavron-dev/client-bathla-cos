import KBar from '@/components/kbar'
import AppSidebar from '@/components/layout/app-sidebar'
import Header from '@/components/layout/header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { navItems } from '@/config/exec-nav-config'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Executive · Bathla COS',
  description: 'Bathla COS executive dashboard',
}

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const role = session?.user?.role
  if (!role || (role !== 'director' && role !== 'manager' && role !== 'member')) {
    redirect('/')
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar navItems={navItems} />
        <SidebarInset>
          <Header />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  )
}
