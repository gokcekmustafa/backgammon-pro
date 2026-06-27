import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Backgammon Pro',
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/guest-login', label: 'Guest Login' },
  { href: '/lobby', label: 'Lobby' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-stone-950 text-stone-100 antialiased">
        <header className="border-b border-stone-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="text-lg font-bold tracking-tight text-amber-500">
              Backgammon Pro
            </Link>
            <ul className="flex gap-4 text-sm sm:gap-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-stone-400 transition-colors hover:text-stone-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
