import Link from 'next/link';

export default function Login() {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="mt-1 text-sm text-stone-400">Sign in to your account to continue.</p>
        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
              placeholder="••••••••"
            />
          </div>
          <Link
            href="/lobby"
            className="block rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">
          Don&apos;t have an account?{' '}
          <Link href="/guest-login" className="text-amber-500 hover:text-amber-400">
            Play as Guest
          </Link>
        </p>
      </div>
    </div>
  );
}
