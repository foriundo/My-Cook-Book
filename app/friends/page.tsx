import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FriendsPanel } from '@/components/friends-panel';

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Friends</h1>
      <p className="mt-2 text-slate-600">Send requests, accept friends, and share recipes with your closest cooking circle.</p>
      <FriendsPanel />
    </div>
  );
}
