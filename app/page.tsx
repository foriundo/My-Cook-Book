import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect('/recipes');
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-16 text-center">
      <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">Cook smarter, not harder</div>
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">Your personal cookbook, scaled to real life.</h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">Save recipes, adjust servings, track nutrition, and remix dishes without losing the original.</p>
      </div>
      <div className="flex gap-3">
        <Link href="/signin"><Button size="lg">Get started</Button></Link>
        <Link href="/recipes"><Button variant="outline" size="lg">Browse demo</Button></Link>
      </div>
    </section>
  );
}
