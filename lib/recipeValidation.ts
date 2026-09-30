import { z } from 'zod';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const nullablePositiveNumber = z.number().finite().nonnegative().nullable().optional();

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: nullableText(5000),
  coverImageUrl: nullableText(2048),
  coverImageAlt: nullableText(300),
  images: z.array(z.object({
    url: z.string().trim().min(1).max(2048).refine((value) => {
      if (value.startsWith('/uploads/') && !value.includes('..')) return true;
      try { new URL(value); return true; } catch { return false; }
    }),
    caption: nullableText(300),
  })).max(10).optional(),
  baseServings: z.number().int().min(1).max(100).optional(),
  prepMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  cookMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).nullable().optional(),
  cuisine: nullableText(100),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  caloriesPerServing: z.number().int().min(0).nullable().optional(),
  proteinG: nullablePositiveNumber,
  carbsG: nullablePositiveNumber,
  fatG: nullablePositiveNumber,
  visibility: z.enum(['PRIVATE', 'FRIENDS', 'UNLISTED', 'PUBLIC']).optional(),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    quantity: z.number().finite().positive().nullable().optional(),
    unit: nullableText(40),
    note: nullableText(300),
    group: nullableText(100),
    scalable: z.boolean().optional(),
  })).max(100).optional(),
  steps: z.array(z.object({
    text: z.string().trim().min(1).max(4000),
    timerSeconds: z.number().int().min(0).max(86400).nullable().optional(),
    imageUrl: nullableText(2048),
  })).max(100).optional(),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;