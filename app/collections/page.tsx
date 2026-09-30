import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CollectionsPanel } from '@/components/collections-panel';

export default async function CollectionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Collections</h1>
      <CollectionsPanel />
    </div>
  );
}
