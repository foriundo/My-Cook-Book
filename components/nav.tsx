import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';

export async function Nav() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const unreadShares = session?.user?.id
    ? await db.share.count({ where: { sharedWithId: session.user.id, seenAt: null } })
    : 0;

  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-slate-900">My Cook Book</Link>
          {isLoggedIn && (
            <>
              <Link href="/recipes" className="text-sm text-slate-700">Recipes</Link>
              <Link href="/recipes/new" className="text-sm text-slate-700">New Recipe</Link>
              <Link href="/shopping-list" className="text-sm text-slate-700">Shopping list</Link>
              <Link href="/friends" className="text-sm text-slate-700">Friends</Link>
              <Link href="/inbox" className="text-sm text-slate-700">Inbox{unreadShares > 0 ? ` (${unreadShares})` : ''}</Link>
              <Link href="/collections" className="text-sm text-slate-700">Collections</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
              <Button type="submit" variant="outline">Sign out</Button>
            </form>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-slate-700">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
