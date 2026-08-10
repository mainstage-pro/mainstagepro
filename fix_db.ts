import { prisma } from "./src/lib/prisma";
async function run() {
  const res = await prisma.$executeRawUnsafe(`UPDATE tareas SET "tratoId" = NULL WHERE "tratoId" IS NOT NULL AND "tratoId" NOT IN (SELECT id FROM tratos);`);
  console.log("Fixed", res);
}
run();
