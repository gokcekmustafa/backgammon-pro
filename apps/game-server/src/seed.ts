import { PrismaClient } from '@backgammon/database';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rooms...');

  const rooms = [
    {
      name: 'Beginners',
      slug: 'beginners',
      description: 'For new players',
      sortOrder: 1,
    },
    {
      name: 'Advanced',
      slug: 'advanced',
      description: 'Experienced players',
      sortOrder: 2,
    },
    {
      name: 'Tournament',
      slug: 'tournament',
      description: 'Competitive play',
      sortOrder: 3,
    },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { slug: room.slug },
      update: room,
      create: room,
    });
    console.log(`  Room created: ${room.name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
