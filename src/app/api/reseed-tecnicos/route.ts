import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "setup-mainstage-2026-schema";

const ROLES = [
  { nombre: "Producción",              tipoPago: "POR_PROYECTO", orden: 1 },
  { nombre: "Coordinación",            tipoPago: "POR_JORNADA",  orden: 2 },
  { nombre: "Supervisión",             tipoPago: "POR_JORNADA",  orden: 3 },
  { nombre: "Operador de Audio",       tipoPago: "POR_JORNADA",  orden: 4 },
  { nombre: "Operador de Iluminación", tipoPago: "POR_JORNADA",  orden: 5 },
  { nombre: "Operador de Video",       tipoPago: "POR_JORNADA",  orden: 6 },
  { nombre: "Técnico de Rigging",      tipoPago: "POR_JORNADA",  orden: 7 },
  { nombre: "Técnico / Stagehand",     tipoPago: "POR_JORNADA",  orden: 8 },
  { nombre: "DJ",                      tipoPago: "POR_PROYECTO", orden: 9 },
];

const TECNICOS = [
  { nombre: "Sebastián Sáenz",       nivel: "AAA", rolNombre: "Producción" },
  { nombre: "Andrés Arroyo",         nivel: "AAA", rolNombre: "Coordinación",            celular: null,              comentarios: "Coordinador de eventos musicales principalmente, puede realizar coordinación de sociales y empresariales. También: Operador de Iluminación AAA, Stagehand." },
  { nombre: "Carlos Luna",           nivel: "AA",  rolNombre: "Coordinación",            celular: "+524422697815",   comentarios: "También: Supervisión AAA, Operador de Video AA, Stagehand." },
  { nombre: "Ulises Ulage",          nivel: "AAA", rolNombre: "DJ",                      celular: "+5214421918343",  comentarios: "Especialidad: Social. También: Coordinación A, Supervisión AA." },
  { nombre: "Hozmiry",               nivel: "AAA", rolNombre: "Operador de Audio",       celular: "4426372961" },
  { nombre: "Rafa Gutiérrez",        nivel: "AAA", rolNombre: "Operador de Video",       celular: "+524425842680",   comentarios: "También: Operador de Audio A, Stagehand." },
  { nombre: "Luis Zavala",           nivel: "AA",  rolNombre: "Operador de Audio",       celular: "(55) 51467789",   comentarios: "También: Operador de Iluminación AA, Stagehand." },
  { nombre: "Felipe Romero",         nivel: "AA",  rolNombre: "Operador de Audio",       celular: "+524432182142",   comentarios: "También: Stagehand." },
  { nombre: "Oscar Joya",            nivel: "AAA", rolNombre: "Operador de Audio",       celular: "+524421865835" },
  { nombre: "Daniel Molina",         nivel: "AAA", rolNombre: "Operador de Audio",       celular: "+5214425467952" },
  { nombre: "Fabián Alcázar",        nivel: "AA",  rolNombre: "Operador de Audio",       celular: "+524422499475",   comentarios: "También: Stagehand AA." },
  { nombre: "Gus",                   nivel: "AA",  rolNombre: "Operador de Audio",       celular: "4427223348" },
  { nombre: "Rubén Jaimes",          nivel: "AA",  rolNombre: "Operador de Audio",       celular: "4421473696" },
  { nombre: "Ismael Palazuelos",     nivel: "AAA", rolNombre: "Operador de Audio" },
  { nombre: "Yhonas Sánchez",        nivel: "AAA", rolNombre: "Operador de Iluminación", celular: "+524427525419" },
  { nombre: "Rodrigo Vera",          nivel: "AA",  rolNombre: "Operador de Iluminación", celular: "+524428633175" },
  { nombre: "Diego Luna",            nivel: "AA",  rolNombre: "Operador de Iluminación", celular: "+524425840086",   comentarios: "También: Stagehand." },
  { nombre: "Israel Pérez",          nivel: "AAA", rolNombre: "Operador de Iluminación", celular: "+524423209302" },
  { nombre: "Aron Padilla",          nivel: "AA",  rolNombre: "Operador de Iluminación", celular: "4428219238",      comentarios: "También: DJ Open Format AA." },
  { nombre: "Mauricio Arpa",         nivel: "AA",  rolNombre: "Operador de Iluminación" },
  { nombre: "Luis Alberto Pérez",    nivel: "AA",  rolNombre: "Operador de Iluminación", celular: "+524421314295",   comentarios: "También: Stagehand." },
  { nombre: "Javier Pérez",          nivel: "AA",  rolNombre: "Operador de Iluminación", celular: "4427987930",      comentarios: "También: Stagehand." },
  { nombre: "Santiago Moya",         nivel: "A",   rolNombre: "Operador de Iluminación", celular: "+524421313484",   comentarios: "También: Stagehand." },
  { nombre: "Nanes",                 nivel: "AA",  rolNombre: "Operador de Iluminación", celular: "+524425099737" },
  { nombre: "Noé",                   nivel: "AA",  rolNombre: "Técnico de Rigging",      celular: null,              comentarios: "También: Stagehand AA." },
  { nombre: "Fabrizio",              nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524423367954" },
  { nombre: "Lalo",                  nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+5215511923189" },
  { nombre: "Paki Arias",            nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524423534445" },
  { nombre: "Cheb",                  nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524421608295" },
  { nombre: "Alex Flores",           nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524421444823" },
  { nombre: "Rodrigo",               nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524422199900" },
  { nombre: "Emmanuel Mane",         nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524461042287" },
  { nombre: "Carlos García",         nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "4427899757",      comentarios: "Conocido como Sock." },
  { nombre: "Ángel",                 nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+525614268224",   comentarios: "Amigo de Roy." },
  { nombre: "Eduardo Sánchez",       nivel: "A",   rolNombre: "Técnico / Stagehand",     celular: "+524426106308" },
  { nombre: "Felix Nex",             nivel: "A",   rolNombre: "Técnico / Stagehand" },
  { nombre: "Alberto Ulage",         nivel: "A",   rolNombre: "Técnico / Stagehand" },
  { nombre: "Pepe Foro Arpa",        nivel: "AA",  rolNombre: "Técnico / Stagehand",     celular: "+524421869059" },
  { nombre: "Victor Oronoz",         nivel: "AA",  rolNombre: "Técnico / Stagehand",     celular: "+524421869059" },
  { nombre: "Lalo Zamora",           nivel: "AA",  rolNombre: "Técnico / Stagehand" },
  { nombre: "Carlos Efraín",         nivel: "A",   rolNombre: "Técnico / Stagehand",     comentarios: "Papá de Luna." },
  { nombre: "Isaac",                 nivel: "A",   rolNombre: "Técnico / Stagehand" },
  { nombre: "Juan Carlos Herrera",   nivel: "AA",  rolNombre: "DJ",                      celular: "+524423439295",   comentarios: "Especialidad: Social. También: Stagehand." },
  { nombre: "Edgar Olvera",          nivel: "AA",  rolNombre: "DJ",                      celular: "4423370710",      comentarios: "Especialidad: Open Format." },
  { nombre: "Arturo Muñoz",          nivel: "AAA", rolNombre: "DJ",                      celular: "+524421164131",   comentarios: "Especialidad: Open Format." },
  { nombre: "Elias Yunes",           nivel: "AA",  rolNombre: "DJ",                      celular: "4424324182",      comentarios: "Especialidad: Social." },
  { nombre: "Marco Pizano",          nivel: "AA",  rolNombre: "DJ",                      celular: "+524423323803",   comentarios: "Especialidad: Open Format." },
  { nombre: "David Villagomez",      nivel: "AA",  rolNombre: "DJ",                      celular: "4425461677",      comentarios: "Especialidad: Social." },
  { nombre: "Pablo Jasso",           nivel: "AA",  rolNombre: "DJ",                      celular: "4461033680",      comentarios: "Especialidad: Open Format." },
  { nombre: "Chris Alfred",          nivel: "A",   rolNombre: "DJ",                      celular: "4426531513",      comentarios: "Especialidad: Open Format." },
  { nombre: "DJ Charly Espino",      nivel: "AA",  rolNombre: "DJ",                      celular: "+524422695002",   comentarios: "Especialidad: Social." },
  { nombre: "Rodrigo Díaz",          nivel: "AA",  rolNombre: "DJ",                      celular: "+524425616637",   comentarios: "Especialidad: Open Format." },
  { nombre: "Antonio Flores",        nivel: "AA",  rolNombre: "DJ",                      celular: "4421915951",      comentarios: "Especialidad: Social." },
];

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}));
  if (secret !== SECRET) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 1. Crear roles si no existen
  const rolesMap: Record<string, string> = {};
  for (const r of ROLES) {
    const existing = await prisma.rolTecnico.findFirst({ where: { nombre: r.nombre } });
    if (existing) {
      rolesMap[r.nombre] = existing.id;
    } else {
      const created = await prisma.rolTecnico.create({ data: r });
      rolesMap[r.nombre] = created.id;
    }
  }

  // 2. Crear técnicos si no existen (skip duplicados por nombre)
  let creados = 0;
  let skipped = 0;
  for (const t of TECNICOS) {
    const { rolNombre, ...rest } = t;
    const existing = await prisma.tecnico.findFirst({ where: { nombre: rest.nombre } });
    if (existing) { skipped++; continue; }
    await prisma.tecnico.create({
      data: {
        ...rest,
        celular: rest.celular ?? null,
        comentarios: (rest as { comentarios?: string }).comentarios ?? null,
        rolId: rolesMap[rolNombre] ?? null,
        activo: true,
      },
    });
    creados++;
  }

  return NextResponse.json({
    ok: true,
    roles: Object.keys(rolesMap).length,
    tecnicosCreados: creados,
    tecnicosSkipped: skipped,
  });
}
