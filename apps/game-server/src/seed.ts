import { PrismaClient } from '@backgammon/database';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    console.log('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD not set, skipping super admin seed');
  } else {
    const existing = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);
      await prisma.user.create({
        data: {
          email: superAdminEmail,
          passwordHash,
          username: 'superadmin',
          displayName: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
      });
      console.log(`Super admin created: ${superAdminEmail}`);
    } else {
      console.log('Super admin already exists, skipping');
    }
  }

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

  console.log('Seeding subscription plans...');

  const plans = [
    {
      planType: 'FREE' as const,
      name: 'Free',
      description: 'Basic access with ads',
      price: 0,
      durationDays: 0,
      features: { ads: true, standardAvatar: true, limitedStats: true, tournaments: false },
      sortOrder: 0,
    },
    {
      planType: 'PREMIUM' as const,
      name: 'Premium',
      description: 'No ads, advanced stats, tournament access',
      price: 9.99,
      durationDays: 30,
      currency: 'USD',
      features: { ads: false, advancedStats: true, premiumAvatarFrames: true, tournaments: true },
      sortOrder: 1,
    },
    {
      planType: 'VIP' as const,
      name: 'VIP',
      description: 'All Premium features plus exclusive badges, priority matchmaking, beta features',
      price: 19.99,
      durationDays: 30,
      currency: 'USD',
      features: { ads: false, advancedStats: true, premiumAvatarFrames: true, tournaments: true, exclusiveBadges: true, priorityMatchmaking: true, betaFeatures: true },
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { planType: plan.planType },
      update: plan,
      create: plan,
    });
    console.log(`  Plan created: ${plan.name}`);
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
