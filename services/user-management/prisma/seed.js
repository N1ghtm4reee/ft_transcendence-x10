import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const achievements = [
  { title: 'First Win', description: 'Win your first game', icon: '🥇' },
  { title: 'Master', description: 'Win 10 games', icon: '👑' },
  { title: 'Undefeated', description: 'Win 5 games in a row', icon: '🔥' },
];

for (const achievement of achievements) {
  await prisma.achievements.upsert({
    where: { title: achievement.title },
    update: {},
    create: achievement,
  });
}

  console.log('✅ Achievements seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });