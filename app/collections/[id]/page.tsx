import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CollectionDetailPanel } from '@/components/collection-detail-panel';

export default async function CollectionDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const collection = await db.collection.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-orange-700">Collection</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{collection.emoji} {collection.name}</h1>
      <CollectionDetailPanel collectionId={collection.id} />
    </div>
  );
}