import Link from 'next/link';

export default function GuestLogin() {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Play as Guest</h1>
        <p className="mt-1 text-sm text-stone-400">Pick a display name and jump right in.</p>
        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-stone-300">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
              placeholder="Guest"
            />
          </div>
          <Link
            href="/lobby"
            className="block rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            Enter Lobby
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">
          Want to save your progress?{' '}
          <Link href="/login" className="text-amber-500 hover:text-amber-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
