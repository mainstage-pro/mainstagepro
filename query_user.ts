import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmo7ikcc00000oqfsqwzys8g4' }
  });
  console.log(user?.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
