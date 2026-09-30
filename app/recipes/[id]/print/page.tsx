import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export default async function PrintRecipePage({ params }: { params: { id: string } }) {
  const recipe = await db.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: true, steps: true },
  });

  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft print:border-0 print:shadow-none">
        <h1 className="text-3xl font-bold text-slate-900">{recipe.title}</h1>
        <p className="mt-2 text-slate-600">{recipe.description}</p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ingredients</h2>
            <ul className="mt-3 space-y-2 text-slate-700">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>{ingredient.quantity ?? ''} {ingredient.unit ?? ''} {ingredient.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Steps</h2>
            <ol className="mt-3 space-y-2 text-slate-700">
              {recipe.steps.map((step, index) => (
                <li key={step.id}>{index + 1}. {step.text}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
