import { NextResponse } from 'next/server';
import { importRecipeFromUrl } from '@/lib/importRecipe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ error: 'A recipe URL is required.' }, { status: 400 });
    }

    const recipe = await importRecipeFromUrl(url);
    if (!recipe) {
      return NextResponse.json({ error: 'No recipe data was found at that URL.' }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed.' }, { status: 400 });
  }
}
