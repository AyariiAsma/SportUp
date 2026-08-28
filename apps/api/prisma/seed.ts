import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sports = [
  {
    name: 'running',
    label: 'Running',
    icon: 'run',
    color: '#FF6B35',
    metadata: { hasRoute: true, hasDistance: true, hasElevation: false },
  },
  {
    name: 'walking',
    label: 'Walking',
    icon: 'walk',
    color: '#4ECDC4',
    metadata: { hasRoute: true, hasDistance: true, hasElevation: false },
  },
  {
    name: 'cycling',
    label: 'Cycling',
    icon: 'bicycle',
    color: '#45B7D1',
    metadata: { hasRoute: true, hasDistance: true, hasElevation: true },
  },
  {
    name: 'hiking',
    label: 'Hiking',
    icon: 'hiking',
    color: '#96CEB4',
    metadata: { hasRoute: true, hasDistance: true, hasElevation: true },
  },
  {
    name: 'football',
    label: 'Football',
    icon: 'football',
    color: '#2ECC71',
    metadata: { hasRoute: false, hasDistance: false, hasTeams: true },
  },
  {
    name: 'basketball',
    label: 'Basketball',
    icon: 'basketball',
    color: '#E67E22',
    metadata: { hasRoute: false, hasDistance: false, hasTeams: true },
  },
  {
    name: 'fitness',
    label: 'Fitness',
    icon: 'fitness',
    color: '#9B59B6',
    metadata: { hasRoute: false, hasDistance: false, hasEquipment: true },
  },
  {
    name: 'yoga',
    label: 'Yoga',
    icon: 'yoga',
    color: '#F39C12',
    metadata: { hasRoute: false, hasDistance: false, hasLevel: true },
  },
  {
    name: 'swimming',
    label: 'Swimming',
    icon: 'swim',
    color: '#3498DB',
    metadata: { hasRoute: false, hasDistance: true, hasLaps: true },
  },
  {
    name: 'tennis',
    label: 'Tennis',
    icon: 'tennis',
    color: '#1ABC9C',
    metadata: { hasRoute: false, hasDistance: false, hasCourt: true },
  },
  {
    name: 'group-workout',
    label: 'Group Workout',
    icon: 'people',
    color: '#E74C3C',
    metadata: { hasRoute: false, hasDistance: false, hasEquipment: true },
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert sports (idempotent)
  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { name: sport.name },
      update: {
        label: sport.label,
        icon: sport.icon,
        color: sport.color,
        metadata: sport.metadata,
      },
      create: sport,
    });
    console.log(`  ✅ Sport: ${sport.label}`);
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
