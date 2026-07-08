import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🔌 Conectando a la base de datos...");
  console.log("   Host:", process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "NO DATABASE_URL");
  
  const prisma = new PrismaClient({
    log: ["error"],
  });

  const newPassword = "Mauricio2024!";
  const hashed = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email: "mauricio@mainstagepro.mx" },
    data: { password: hashed },
    select: { id: true, name: true, email: true },
  });

  console.log("✅ Contraseña actualizada para:", user.name, `(${user.email})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e.message || e);
  process.exit(1);
});
