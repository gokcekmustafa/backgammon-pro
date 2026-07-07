import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/providers/Providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PwaRegister from '@/components/PwaRegister';
import NavBar from '@/components/NavBar';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <body
        className="flex min-h-full flex-col bg-stone-950 text-stone-100 antialiased"
        style={{ backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }}
      >
        <Providers>
          <PwaRegister />
          <NavBar />
          <main className="flex-1 px-safe pt-safe" id="main-content">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </Providers>
      </body>
    </html>
  );
}
