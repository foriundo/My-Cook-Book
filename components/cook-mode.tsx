'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CookRecipe = {
  id: string;
  title: string;
  ingredients: Array<{ id: string; name: string; quantity: number | null; unit: string | null }>;
  steps: Array<{ id: string; text: string; timerSeconds: number | null }>;
};

export function CookMode({ recipe }: { recipe: CookRecipe }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const currentStep = recipe.steps[stepIndex];

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') setStepIndex((index) => Math.min(recipe.steps.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setStepIndex((index) => Math.max(0, index - 1));
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [recipe.steps.length]);

  useEffect(() => {
    if (!Object.values(timers).some((seconds) => seconds > 0)) return;
    const interval = window.setInterval(() => {
      setTimers((current) => Object.fromEntries(Object.entries(current).map(([id, seconds]) => [id, Math.max(0, seconds - 1)])));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timers]);

  useEffect(() => {
    const completed = Object.entries(timers).filter(([, seconds]) => seconds === 0);
    if (!completed.length) return;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      oscillator.connect(context.destination);
      oscillator.frequency.value = 880;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
      oscillator.onended = () => void context.close();
    } catch {
      // Audio may be unavailable or blocked by the browser.
    }
    setTimers((current) => {
      const next = { ...current };
      for (const [id] of completed) delete next[id];
      return next;
    });
  }, [timers]);

  useEffect(() => {
    type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
    let lock: { release: () => Promise<void> } | undefined;
    void (navigator as WakeLockNavigator).wakeLock?.request('screen').then((wakeLock) => { lock = wakeLock; }).catch(() => undefined);
    return () => { void lock?.release(); };
  }, []);

  function toggleIngredient(id: string) {
    setCheckedIngredients((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function startTimer(id: string, seconds: number) {
    setTimers((current) => ({ ...current, [id]: seconds }));
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  if (!currentStep) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-700">This recipe has no steps yet.</div>;
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-stone-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <p className="text-sm text-orange-700">Cook mode · {recipe.title}</p>
            <h1 className="mt-1 text-xl font-semibold text-stone-900">Step {stepIndex + 1} of {recipe.steps.length}</h1>
          </div>
          <button type="button" onClick={() => router.push(`/recipes/${recipe.id}`)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700">Exit</button>
        </header>

        <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <p className="min-h-56 rounded-xl bg-white p-6 text-2xl leading-relaxed text-stone-900 shadow-sm sm:p-10 sm:text-4xl">{currentStep.text}</p>
            {currentStep.timerSeconds && (
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => startTimer(currentStep.id, currentStep.timerSeconds!)} className="rounded-lg bg-orange-700 px-4 py-2 text-sm text-white">Start {Math.round(currentStep.timerSeconds / 60)} min timer</button>
                {timers[currentStep.id] !== undefined && <span aria-live="polite" className="text-xl font-semibold tabular-nums text-stone-900">{formatTime(timers[currentStep.id])}</span>}
              </div>
            )}

            <div className="mt-8 flex justify-between gap-3">
              <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => Math.max(0, index - 1))} className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-50">Previous</button>
              <button type="button" onClick={() => stepIndex === recipe.steps.length - 1 ? router.push(`/recipes/${recipe.id}`) : setStepIndex((index) => index + 1)} className="rounded-lg bg-orange-700 px-4 py-2 text-sm text-white">{stepIndex === recipe.steps.length - 1 ? 'Finish cooking' : 'Next step'}</button>
            </div>
          </section>

          <aside>
            <h2 className="text-lg font-semibold text-stone-900">Prep ingredients</h2>
            <ul className="mt-3 divide-y divide-stone-200">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="py-2">
                  <label className="flex items-start gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={checkedIngredients.includes(ingredient.id)} onChange={() => toggleIngredient(ingredient.id)} className="mt-1" />
                    <span className={checkedIngredients.includes(ingredient.id) ? 'text-stone-400 line-through' : ''}>
                      {[ingredient.quantity, ingredient.unit, ingredient.name].filter((value) => value !== null && value !== '').join(' ')}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-500">Use the left and right arrow keys to move between steps.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}