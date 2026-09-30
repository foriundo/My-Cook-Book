import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { RecipeBrowser } from '@/components/recipe-browser';

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const recipes = await db.recipe.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      ingredients: { select: { name: true } },
      ratings: { select: { userId: true, stars: true } },
      _count: { select: { cookLogs: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My recipes</h1>
          <p className="text-slate-600">A running list of the dishes you are saving and scaling.</p>
        </div>
        <Link href="/recipes/new"><Button>New recipe</Button></Link>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <h2 className="text-xl font-semibold text-slate-900">No recipes yet</h2>
          <p className="mt-2 text-slate-600">Add your first dish or import from a link.</p>
          <Link href="/recipes/new" className="mt-4 inline-flex"><Button>Create recipe</Button></Link>
        </div>
      ) : (
        <RecipeBrowser recipes={recipes} />
      )}
    </div>
  );
}
