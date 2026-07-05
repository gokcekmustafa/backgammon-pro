export const runtime = 'edge';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Backgammon Pro</h1>
        <p className="mt-4 text-stone-400">
          Play backgammon online. Challenge friends or find a match.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            Sign In
          </Link>
          <Link
            href="/guest-login"
            className="rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
          >
            Play as Guest
          </Link>
          <Link
            href="/lobby"
            className="rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
          >
            Browse Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
