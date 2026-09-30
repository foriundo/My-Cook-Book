'use client';

import { useMemo, useState } from 'react';
import { RecipeCard } from '@/components/recipe-card';

type BrowserRecipe = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  baseServings: number;
  caloriesPerServing: number | null;
  tags: string;
  coverImageUrl: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  cuisine: string | null;
  difficulty: string | null;
  videoUrl: string | null;
  createdAt: Date | string;
  ingredients: Array<{ name: string }>;
  ratings: Array<{ userId: string; stars: number }>;
  _count: { cookLogs: number };
};

export function RecipeBrowser({ recipes }: { recipes: BrowserRecipe[] }) {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [minRating, setMinRating] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [sort, setSort] = useState('newest');

  const tags = [...new Set(recipes.flatMap((recipe) => parseTags(recipe.tags)))].sort();
  const cuisines = [...new Set(recipes.map((recipe) => recipe.cuisine).filter((value): value is string => Boolean(value)))].sort();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = recipes.filter((recipe) => {
      const recipeTags = parseTags(recipe.tags);
      const text = [recipe.title, recipe.description ?? '', ...recipe.ingredients.map((item) => item.name), ...recipeTags].join(' ').toLowerCase();
      const totalTime = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
      const ratings = recipe.ratings.filter((rating) => rating.userId !== recipe.ownerId);
      const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length : 0;
      return (!query || text.includes(query))
        && (!tag || recipeTags.includes(tag))
        && (!cuisine || recipe.cuisine === cuisine)
        && (!difficulty || recipe.difficulty === difficulty)
        && (!maxTime || (totalTime > 0 && totalTime <= Number(maxTime)))
        && (!maxCalories || (recipe.caloriesPerServing !== null && recipe.caloriesPerServing <= Number(maxCalories)))
        && (!minRating || average >= Number(minRating))
        && (!hasVideo || Boolean(recipe.videoUrl));
    });

    return [...matches].sort((left, right) => {
      if (sort === 'topRated') return averageRating(right) - averageRating(left);
      if (sort === 'mostCooked') return right._count.cookLogs - left._count.cookLogs;
      if (sort === 'quickest') return time(left) - time(right);
      if (sort === 'fewestCalories') return (left.caloriesPerServing ?? Number.MAX_VALUE) - (right.caloriesPerServing ?? Number.MAX_VALUE);
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [recipes, search, tag, cuisine, difficulty, maxTime, maxCalories, minRating, hasVideo, sort]);

  return (
    <>
      <div className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-4">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, ingredient, or tag" className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" />
        <select aria-label="Sort recipes" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="newest">Newest</option><option value="topRated">Top rated</option><option value="mostCooked">Most cooked</option><option value="quickest">Quickest</option><option value="fewestCalories">Fewest calories</option>
        </select>
        <select aria-label="Filter by tag" value={tag} onChange={(event) => setTag(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">All tags</option>{tags.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by cuisine" value={cuisine} onChange={(event) => setCuisine(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">All cuisines</option>{cuisines.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
        </select>
        <input aria-label="Maximum total time" type="number" min={1} value={maxTime} onChange={(event) => setMaxTime(event.target.value)} placeholder="Max minutes" className="rounded-lg border border-slate-300 px-3 py-2" />
        <input aria-label="Maximum calories" type="number" min={0} value={maxCalories} onChange={(event) => setMaxCalories(event.target.value)} placeholder="Max calories" className="rounded-lg border border-slate-300 px-3 py-2" />
        <select aria-label="Minimum rating" value={minRating} onChange={(event) => setMinRating(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option>
        </select>
        <label className="flex items-center gap-2 px-2 text-sm text-slate-700"><input type="checkbox" checked={hasVideo} onChange={(event) => setHasVideo(event.target.checked)} />Has video</label>
      </div>
      <p className="mt-4 text-sm text-slate-600">{filtered.length} recipes</p>
      {filtered.length ? <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : <p className="mt-8 text-center text-slate-600">No recipes match these filters.</p>}
    </>
  );
}

function parseTags(raw: string) {
  try { return JSON.parse(raw || '[]') as string[]; } catch { return []; }
}

function averageRating(recipe: BrowserRecipe) {
  const ratings = recipe.ratings.filter((rating) => rating.userId !== recipe.ownerId);
  return ratings.length ? ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length : 0;
}

function time(recipe: BrowserRecipe) {
  return (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || Number.MAX_VALUE;
}