import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { id: 'cmo7ikcc00000oqfsqwzys8g4', area: 'ADMINISTRACION' },
    { id: 'cmo6mbjqy0001eruqem29tp7k', area: 'MARKETING' },
    { id: 'cmnxjcynq0000aloaylskv8g6', area: 'PRODUCCION' },
    { id: 'cmo6m8jzj0000298l2oo20o1u', area: 'PRODUCCION' },
    { id: 'cmp3ew8mf0000v6xkmwrbuy5w', area: 'PRODUCCION' },
    { id: 'cmo6m98n80000eruqx1tk6er4', area: 'DIRECCION' },
    { id: 'cmnrpg62h0000zmizxpydetsm', area: 'DIRECCION' },
  ];

  for (const u of updates) {
    try {
      await prisma.user.update({ where: { id: u.id }, data: { area: u.area } });
      console.log(`✓ ${u.id} → ${u.area}`);
    } catch (e) {
      console.log(`✗ ${u.id}: ${e}`);
    }
  }

  console.log('Done!');
  await prisma.$disconnect();
}

main();
