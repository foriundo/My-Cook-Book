import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ShoppingListPanel } from '@/components/shopping-list-panel';

export default async function ShoppingListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Shopping list</h1>
      <p className="mt-2 text-slate-600">Combine your recipe ingredients into one clean checklist.</p>
      <ShoppingListPanel />
    </div>
  );
}
