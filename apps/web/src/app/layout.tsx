import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Bathla COS',
  description: 'Internal Chief of Staff for Bathla Homes',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const activeTheme = cookieStore.get('active_theme')?.value

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className={`min-h-full flex flex-col theme-${activeTheme ?? 'bathla'}`}
        suppressHydrationWarning
      >
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <Providers initialTheme={activeTheme ?? 'bathla'}>{children}</Providers>
      </body>
    </html>
  )
}
