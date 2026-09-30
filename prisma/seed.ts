import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: 'demo@cookbook.dev' },
    update: {},
    create: {
      email: 'demo@cookbook.dev',
      name: 'Demo Cook',
      username: 'demo-cook',
      passwordHash: '$2a$10$g6p8u6R5qVQ0r4h6qYcQDO.JL5a3v0rJ8V9yFAl2P.dFVv7k5B44S',
    },
  });

  const existingRecipe = await db.recipe.findFirst({
    where: { ownerId: user.id, title: 'Lemon Pasta' },
  });

  if (!existingRecipe) {
    await db.recipe.create({
      data: {
        ownerId: user.id,
        title: 'Lemon Pasta',
        description: 'Bright, quick, and easy to scale for a weeknight dinner.',
        baseServings: 4,
        caloriesPerServing: 420,
        tags: JSON.stringify(['quick', 'easy']),
        ingredients: {
          create: [
            { order: 0, quantity: 8, unit: 'oz', name: 'pasta', scalable: true },
            { order: 1, quantity: 2, unit: 'tbsp', name: 'butter', scalable: true },
            { order: 2, quantity: 1, unit: 'lemon', name: 'juice', scalable: false },
          ],
        },
        steps: {
          create: [
            { order: 0, text: 'Boil the pasta until just tender.', timerSeconds: 600 },
            { order: 1, text: 'Toss with butter and lemon juice.', timerSeconds: 120 },
          ],
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
