import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const achievements = [
  { title: 'First Win', description: 'Win your first game', icon: '/icons/first-win.png' },
  { title: 'Master', description: 'Win 10 games', icon: '/icons/master.png' },
  { title: 'Undefeated', description: 'Win 5 games in a row', icon: '/icons/undefeated.png' },
];

for (const achievement of achievements) {
  await prisma.achievements.upsert({
    where: { title: achievement.title },
    update: {},
    create: achievement,
  });
}

  console.log(':white_check_mark: Achievements seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });