import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { RecipeForm } from '@/components/recipe-form';

export default async function NewRecipePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Create a recipe</h1>
        <p className="text-slate-600">Capture a recipe, add ingredients, steps, and save it to your cookbook.</p>
      </div>
      <RecipeForm />
    </div>
  );
}
