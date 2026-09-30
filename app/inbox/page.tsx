import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InboxPanel } from '@/components/inbox-panel';

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Inbox</h1>
      <InboxPanel />
    </div>
  );
}
