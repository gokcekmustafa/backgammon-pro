import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Providers } from '@/providers/Providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: {
    default: 'Backgammon Pro',
    template: '%s | Backgammon Pro',
  },
  description: 'Play backgammon online. Challenge friends or find a match in real-time.',
  keywords: ['backgammon', 'online game', 'board game', 'multiplayer'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Backgammon Pro',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Backgammon Pro',
    description: 'Play backgammon online. Challenge friends or find a match in real-time.',
    type: 'website',
    siteName: 'Backgammon Pro',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/guest-login', label: 'Guest Login' },
  { href: '/lobby', label: 'Lobby' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/settings', label: 'Settings' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col bg-stone-950 text-stone-100 antialiased"
        style={{ backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }}
      >
        <Providers>
          <PwaRegister />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-stone-950"
          >
            Skip to main content
          </a>
          <header
            className="border-b border-stone-800"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <nav
              className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6"
              aria-label="Main navigation"
            >
              <Link
                href="/"
                className="text-lg font-bold tracking-tight text-amber-500 hover:text-amber-400"
                aria-label="Backgammon Pro Home"
                style={{ color: 'rgb(var(--color-accent))' }}
              >
                Backgammon Pro
              </Link>
              <ul className="flex gap-4 text-sm sm:gap-6" role="list">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-stone-400 transition-colors hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </header>
          <main className="flex-1 px-safe pt-safe" id="main-content">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </Providers>
      </body>
    </html>
  );
}
