import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: "cheb", mode: "insensitive" } },
        { name: { contains: "sebast", mode: "insensitive" } },
        { email: { contains: "cheb", mode: "insensitive" } },
      ],
    },
  });

  const cheb = users.find(u => u.name.toLowerCase().includes("cheb") || u.email.toLowerCase().includes("cheb") || u.name.toLowerCase().includes("sebast"));
  if (!cheb) {
    return NextResponse.json({ error: "Could not find Cheb", users });
  }

  const marketingKeys = [
    "plan-trabajo",
    "operaciones",
    "calendario",
    "vision-semanal",
    "mkt-contenido",
    "mkt-publicidad",
    "mkt-config",
    "tareas-marketing",
  ];

  const results = [];
  for (const key of marketingKeys) {
    await prisma.moduloAcceso.upsert({
      where: {
        moduloKey_userId: {
          moduloKey: key,
          userId: cheb.id,
        },
      },
      update: {},
      create: {
        moduloKey: key,
        userId: cheb.id,
      },
    });
    results.push(`Granted ${key} to ${cheb.name}`);
  }

  return NextResponse.json({ success: true, user: cheb.name, results });
}
