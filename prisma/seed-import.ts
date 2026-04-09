/**
 * Script de importación: Clientes, Proveedores y Técnicos
 * Ejecutar con:  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-import.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando importación...\n");

  // ─── 1. ROL TÉCNICOS ───────────────────────────────────────────────────────
  const rolesInput = [
    { nombre: "Producción",             tipoPago: "POR_PROYECTO", orden: 1 },
    { nombre: "Coordinación",           tipoPago: "POR_JORNADA",  orden: 2 },
    { nombre: "Supervisión",            tipoPago: "POR_JORNADA",  orden: 3 },
    { nombre: "Operador de Audio",      tipoPago: "POR_JORNADA",  orden: 4 },
    { nombre: "Operador de Iluminación",tipoPago: "POR_JORNADA",  orden: 5 },
    { nombre: "Operador de Video",      tipoPago: "POR_JORNADA",  orden: 6 },
    { nombre: "Técnico de Rigging",     tipoPago: "POR_JORNADA",  orden: 7 },
    { nombre: "Técnico / Stagehand",    tipoPago: "POR_JORNADA",  orden: 8 },
    { nombre: "DJ",                     tipoPago: "POR_PROYECTO", orden: 9 },
  ];

  const roles: Record<string, string> = {};
  for (const r of rolesInput) {
    const ex = await prisma.rolTecnico.findFirst({ where: { nombre: r.nombre } });
    if (ex) { roles[r.nombre] = ex.id; }
    else { const c = await prisma.rolTecnico.create({ data: r }); roles[r.nombre] = c.id; }
  }
  console.log(`✓ Roles técnicos: ${Object.keys(roles).length}`);

  // ─── 2. CLIENTES ──────────────────────────────────────────────────────────
  const clientesData = [
    { nombre: "Aldo",              empresa: "Magenta",                  telefono: "5544578415",    tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA",              notas: "Me iba a contratar luces en el teatro de la ciudad" },
    { nombre: "Aldo",              empresa: "Sisi",                                                tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA",              notas: "Me contrató 1 vez cdj 3000 para Sisi" },
    { nombre: "Alex González",     empresa: "Omni",                                                tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA", notas: "Contrataron a otro proveedor por un audio de mayor calidad" },
    { nombre: "Álvaro Balderas",   empresa: "Shedo Bar",                telefono: "524422394866",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Me contrató un evento en Shedo Bar" },
    { nombre: "Ana Pier",                                                                           tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Andrés Arroyo",                                          telefono: "524423623400",  tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Tiene buenos clientes de eventos sociales grandes y bien conectado en show grande" },
    { nombre: "Angel Aguilar",     empresa: "Grupo Sirilo",             telefono: "+521442239459", tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO",      notas: "Toma de decisión de Omni" },
    { nombre: "Angel Salgado",     empresa: "One Link Production",                                 tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO",      notas: "Eventos en SMA" },
    { nombre: "Angélica Sánchez",  empresa: "Devanny",                                             tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Antonio Mart",      empresa: "Latin Sound",                                         tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Arturo Muñoz",                                                                       tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO",      notas: "DJ de eventos sociales premium" },
    { nombre: "Blanca",            empresa: "Bodegas Decote",                                       tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Tienen eventos empresariales seguido en De Cote" },
    { nombre: "Brian",             empresa: "Hu Production",                                        tipoCliente: "B2B", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO",      notas: "Trabaja para una empresa productora muy grande, requieren apoyo seguido por tantos eventos" },
    { nombre: "Carlos de Silva",                                        telefono: "4423774530",    tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO" },
    { nombre: "Carlos Mena",                                            telefono: "525564646521",  tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "MULTISERVICIO" },
    { nombre: "Carlos Vargas",     empresa: "Kuulto",                   telefono: "+524428219163", tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Carlos Vargas",     empresa: "Sonar",                                               tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "César Bravo",                                                                        tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Cumple años en octubre y le gusta festejar" },
    { nombre: "Charlie",                                                telefono: "4425572432",    tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Chema González",                                                                     tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Chino",             empresa: "Omni",                     telefono: "525517833456",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Chris Makris",      empresa: "Royal Prestige",                                       tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Daniel",            empresa: "Conexzion",                                            tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Daniel Molina",     empresa: "Tour Manager",             telefono: "5214425467952", tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Daniel Murillo",    empresa: "Tempo",                    telefono: "5214421174156", tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "MULTISERVICIO" },
    { nombre: "De Color",                                                                           tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Diego Herrera",     empresa: "Kuulto",                                               tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Diego Montes",      empresa: "Fugitivo",                 telefono: "+524611085038", tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Diego Narváez",                                                                      tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO",      notas: "Colabora constantemente con diferentes marcas y promotores" },
    { nombre: "Diego Siqueiros",                                                                    tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO",      notas: "Artista, podemos hacer una gran alianza y crecer en conjunto" },
    { nombre: "DJ Antra",                                               telefono: "524425633205",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Tuvo un evento de Halloween 2025" },
    { nombre: "Dr. Perkins",       empresa: "Academia MS",                                          tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "MULTISERVICIO" },
    { nombre: "Edgar Arcos",                                            telefono: "+524423112557", tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Efrén",             empresa: "Anahuac",                  telefono: "524611808903",  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA",              notas: "Puede ser buen cliente, está estudiando producción de eventos en Anahuac" },
    { nombre: "Eli Bautista",                                                                       tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Enrique Buenrostro",empresa: "Vox Code",                                             tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Eric Peralta",      empresa: "Mortal Sounds",                                        tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO",      notas: "Apoyar con su proyecto Mortal Sounds, están llegando a buenos eventos y artistas de hard" },
    { nombre: "Ernesto Rosas",     empresa: "Contyquim",                telefono: "4422363554",    tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Trabaja en la empresa de su papá, tuvimos una falla técnica y decidieron conseguir otro proveedor" },
    { nombre: "Fabi Castro",                                            telefono: "524461699733",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Nos contrató para su cumpleaños en mayo" },
    { nombre: "Felipe Romero",     empresa: "Motion",                                               tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Felipe",            empresa: "Shedo Bar",                                            tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Fer Martín",                                                                         tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Fernanda Dávalos",                                                                   tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Congreso de abogados en diciembre 2024" },
    { nombre: "Francisco López",   empresa: "Galaxy",                   telefono: "524423224015",  tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "MULTISERVICIO" },
    { nombre: "Gerardo Gutiérrez",                                      telefono: "4426695626",    tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Gerardo Matabuena",                                                                  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO",      notas: "Organizaron una fiesta hace como 5 años, son familia unida, les gusta hacer fiestas" },
    { nombre: "Gus Lethal",        empresa: "Viko",                                                 tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA",              notas: "Cliente que nos compra poco, pero está trabajando en la productora Viko" },
    { nombre: "Habacuc",           empresa: "Vivo Sessions",                                        tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA", notas: "Eventos de Vivo Sessions y Human Festival" },
    { nombre: "Hugo Rangel",       empresa: "Alpha Dog",                telefono: "524425920811",  tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Israel Pérez",                                                                       tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Javier",            empresa: "Lasers",                                               tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Jesús Mondragón",                                        telefono: "4422650366",    tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Joel Reynoso",                                           telefono: "524423308987",  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Jorge Camargo",                                                                      tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Jorge Preciado",                                                                     tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "MULTISERVICIO" },
    { nombre: "José Carlos Negro",                                                                  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "MULTISERVICIO" },
    { nombre: "José Manuel Lara",                                       telefono: "+524423590922", tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "José Pablo Bernal", empresa: "Discos Tabú",              telefono: "524425595536",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Juan Carlos",       empresa: "Childrens",                                            tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Juan Carlos Herrera",empresa: "Eventos Club 20",                                     tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Juan Carlos Soto",  empresa: "Chorcha",                                              tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Juan Manuel Nava",  empresa: "Mouse",                    telefono: "+524424437231", tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO" },
    { nombre: "Juan Pablo",        empresa: "Guanajuato",                                           tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "RENTA" },
    { nombre: "Juan Pablo Salva",  empresa: "Fugitivo",                                             tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Karen",             empresa: "Supraterra",                                           tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Katherine Tello",   empresa: "Eden Ice",                                             tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Cada diciembre tienen evento para papás en la pista de hielo" },
    { nombre: "Kathya Medina",     empresa: "Supraterra",                                           tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "La Barriada Show",                                       telefono: "524424216381",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Laura",                                                                              tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Leo",               empresa: "Mich",                     telefono: "525532734705",  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Leonard Isla",                                                                       tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Leonardo Plata",                                         telefono: "5214423860838", tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "RENTA" },
    { nombre: "Luis Bolaños",                                           telefono: "529511117303",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Luis Miguel Roiz",                                                                   tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Luis Nieto",                                             telefono: "524611808221",  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "María Pineda",                                                                       tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Van a estar teniendo eventos inmobiliarios" },
    { nombre: "Martín Rivas",                                                                       tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Mike Elizalde",     empresa: "Conexzion",                telefono: "+524421451344", tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Nayelly",                                                                            tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA", notas: "Cada 12 de diciembre hacen eventos de fin de año de su empresa" },
    { nombre: "Omar",              empresa: "Nex Djs",                                              tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Oscar Joya",                                             telefono: "524421865835",  tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Paco Fernández",                                         telefono: "524421279638",  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Patricio G",                                                                         tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Pavis de los Cobos",empresa: "We Build",                 telefono: "4422022034",    tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA", notas: "Nos contrata a través de We Build pero está consiguiendo eventos sociales por su cuenta" },
    { nombre: "Ramses Guerra",     empresa: "Conexzion",                                            tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "René Álvarez",                                           telefono: "524427212716",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Ricardo Avendaño",                                       telefono: "4423737080",    tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "RENTA",              notas: "Organiza eventos sociales, nos ha rentado equipo de DJ, pero no sabe que hacemos cosas para sociales también" },
    { nombre: "Ricardo Muñoz",                                          telefono: "524423364823",  tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Roberto",           empresa: "Nex Djs",                  telefono: "524428522822",  tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Rodrigo Díaz",                                           telefono: "4425616637",    tipoCliente: "B2B", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO" },
    { nombre: "Rodrigo Sánchez",                                                                    tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Rodrigo",           empresa: "Conexzion",                                            tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "RENTA" },
    { nombre: "Roger",             empresa: "RM",                                                   tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Santiago Gala",     empresa: "Discover",                 telefono: "34653020594",   tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "MULTISERVICIO" },
    { nombre: "Santiago Perera",   empresa: "Casa de Quino",            telefono: "4423437355",    tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Sebastián Bernal",  empresa: "Radar",                                                tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO",      notas: "Tiene contacto con la radio y seguro podemos entrar como proveedores" },
    { nombre: "Sebastián GT",                                                                       tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO",      notas: "Contacto para hacer el show de Carlos Cuevas en el auditorio" },
    { nombre: "Sebastián Loredo",                                       telefono: "524424674258",  tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "MULTISERVICIO" },
    { nombre: "Sebastián Peñacastro",empresa: "El Mirador Puerta del Lobo",                         tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Sergio Ruiseñor",                                                                    tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Sofía Núñez",                                            telefono: "+527209986865", tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    // CLIENTES NUEVOS
    { nombre: "Artemio",                                                                            tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Ale Urquidi",                                                                        tipoCliente: "B2B", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Alejandro Chávez",                                                                   tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Luca Mersini",                                                                       tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Jorge Ávila",                                                                        tipoCliente: "B2C", clasificacion: "PRIORITY", servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Antonio Hernández",                                                                  tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "RENTA" },
    { nombre: "Mauricio Pedraza",                                                                   tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Enrique Baños",                                                                      tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Abraham",           empresa: "Chorcha",                                              tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Eduardo Flores",                                                                     tipoCliente: "B2C", clasificacion: "REGULAR",  servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Ricardo Padilla",                                                                    tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Juan Pablo",        empresa: "Antra",                                                tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Iván",              empresa: "Pixel Waves",                                          tipoCliente: "B2B", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
    { nombre: "Luis Vega",                                                                          tipoCliente: "B2C", clasificacion: "BASIC",    servicioUsual: "PRODUCCION_TECNICA" },
  ] as const;

  let cCount = 0;
  for (const c of clientesData) {
    await prisma.cliente.create({ data: c });
    cCount++;
  }
  console.log(`✓ Clientes creados: ${cCount}`);

  // ─── 3. PROVEEDORES ───────────────────────────────────────────────────────
  const proveedoresData = [
    // PROMOCIONALES
    { nombre: "Nadia Uniformes",       empresa: "Particular",             giro: "Uniformes y promocionales",          telefono: "4424667054" },
    { nombre: "Cuarto 53",             empresa: "Cuarto 53",              giro: "Impresión y promocionales",          telefono: "4427130602" },
    // SEGUROS
    { nombre: "Mauricio González",     empresa: "Vertizze",               giro: "Seguros" },
    // ADMINISTRACIÓN
    { nombre: "Miguel Pérez",          empresa: "Proser Soluciones",      giro: "Despacho administrativo" },
    // FOTOGRAFÍA Y VIDEO
    { nombre: "Julio Buenrostro",      empresa: "Particular",             giro: "Fotógrafo y videógrafo",             telefono: "+524423353227" },
    { nombre: "Diego Jaramillo",       empresa: "Particular",             giro: "Fotógrafo y videógrafo",             telefono: "+524429626795" },
    { nombre: "Fabián",                empresa: "Particular",             giro: "Fotógrafo y videógrafo",             telefono: "+524422499475" },
    { nombre: "Sebastián Pérez",       empresa: "Particular",             giro: "Fotógrafo y videógrafo",             telefono: "+524421608295",  notas: "Conocido como Cheb" },
    { nombre: "Mauricio Ramos",        empresa: "Particular",             giro: "Fotógrafo y videógrafo",             telefono: "+525614268224" },
    { nombre: "Yeoshua Elizalde",      empresa: "Particular",             giro: "Fotógrafo y videógrafo",             telefono: "4426680028" },
    { nombre: "Alan",                  empresa: "Particular",             giro: "Fotógrafo y videógrafo" },
    { nombre: "Arturo Gómez",          empresa: "Particular",             giro: "Fotógrafo y videógrafo" },
    { nombre: "Core",                  empresa: "Particular",             giro: "Fotógrafo y videógrafo" },
    { nombre: "Santiago Piñón",        empresa: "Particular",             giro: "Fotógrafo y videógrafo" },
    { nombre: "Kuri Acela",            empresa: "Fractal Studio",         giro: "Fotógrafo y videógrafo" },
    // MARKETING
    { nombre: "Aldo Fiorentini",       empresa: "Blended",                giro: "Agencia de Marketing" },
    { nombre: "Carlos Vargas",         empresa: "Off Stage Media",        giro: "Agencia de Marketing",               telefono: "+524425593331" },
    // RENTA DE EQUIPO
    { nombre: "Felipe Romero",         empresa: "Motion Producciones",    giro: "Renta de equipo",                    telefono: "+524432182142" },
    { nombre: "Juan Carlos Herrera",   empresa: "Eventos Club 20",        giro: "Renta de equipo",                    telefono: "+524423439295",  notas: "Renta de equipo Electro Voice, audio y consolas" },
    { nombre: "David Cruz",            empresa: "DJ Zeero",               giro: "Renta de equipo",                    telefono: "+524423915073" },
    { nombre: "Andrés Arroyo",         empresa: "ESG Entertainment",      giro: "Renta de equipo",                    telefono: "+524423623400",  notas: "CDJ 3000, consola Grand MA 3, iluminación Astera" },
    { nombre: "Carlos Vargas",         empresa: "Sonar",                  giro: "Renta de equipo",                    telefono: "+524424141031",  notas: "Drones, cámaras pro, estabilizadores, tijeras 30-50cm, entarimado, dj booths y cabinas, series de focos vintage" },
    { nombre: "Alexis",                empresa: "Alexis Producciones",    giro: "Renta de equipo",                    telefono: "+5214421578763", notas: "Audio RCF, ground support, iluminación" },
    { nombre: "Orlando Orvec",         empresa: "Particular",             giro: "Renta de equipo",                    telefono: "+524422371410",  notas: "Audio Electro Voice" },
    { nombre: "Hugo Rangel",           empresa: "Alpha Dog",              giro: "Renta de equipo",                    telefono: "+524425920811",  notas: "Backline" },
    { nombre: "Néstor Balvanera",      empresa: "Particular",             giro: "Renta de equipo",                    telefono: "+524271583540",  notas: "Bidones" },
    { nombre: "Refugio",               empresa: "Particular",             giro: "Renta de equipo",                    telefono: "4423381659",     notas: "Tarimas y vallas" },
    { nombre: "Fire On Stage",         empresa: "Fire On Stage",          giro: "Renta de equipo",                                                notas: "Chisperos, bazuca de papel metálico" },
    { nombre: "Perkins",               empresa: "Particular",             giro: "Renta de equipo",                    telefono: "+526141910929",  notas: "CDJ 3000 y V10" },
    { nombre: "Juan Carlos Núñez",     empresa: "Particular",             giro: "Renta de equipo",                                                notas: "CDJ 3000 y DJM 900 NXS" },
    { nombre: "Rafael González",       empresa: "Focus Group",            giro: "Renta de equipo",                    telefono: "+525554341290" },
    { nombre: "Ramses Guerra",         empresa: "Conexzion",              giro: "Renta de equipo",                    telefono: "+524461383453" },
    { nombre: "Brian",                 empresa: "Cataleya",               giro: "Renta de equipo" },
    { nombre: "Paulo César",           empresa: "Al Capone Producciones", giro: "Renta de equipo" },
    { nombre: "Paulino Matsumoto",     empresa: "Zircus Producciones",    giro: "Renta de equipo" },
    { nombre: "Rogelio Luna",          empresa: "Rogelio Luna Blackmagic",giro: "Renta de equipo",                    telefono: "+524424531196",  notas: "CCTV" },
    { nombre: "Antonio Mart",          empresa: "Latin Sound",            giro: "Renta de equipo",                                                notas: "Audio Electro Voice" },
    { nombre: "Pepe Machuca",          empresa: "Particular",             giro: "Renta de equipo",                    telefono: "+525529664225",  notas: "Backline" },
    { nombre: "Ciro Beltrán",          empresa: "Particular",             giro: "Renta de equipo",                                                notas: "Proyectores" },
    { nombre: "Loto",                  empresa: "Particular",             giro: "Renta de equipo" },
    { nombre: "Chepe",                 empresa: "Particular",             giro: "Renta de equipo" },
    // TRANSPORTE
    { nombre: "Oswaldo Farías",        empresa: "Particular",             giro: "Transporte",                         telefono: "+525527363735" },
    { nombre: "Jorge Fica",            empresa: "Fica",                   giro: "Transporte",                         telefono: "+524421051064" },
    { nombre: "Alan Lara",             empresa: "Particular",             giro: "Transporte" },
    { nombre: "Daniel",                empresa: "Particular",             giro: "Transporte",                         telefono: "+524424644185" },
    // VENTA DE EQUIPO
    { nombre: "Ricardo Rivera",        empresa: "Audio Music",            giro: "Venta de equipo",                    telefono: "+524422657813" },
    { nombre: "TRS Trussing",          empresa: "Trs Trussing",           giro: "Venta de equipo",                    telefono: "+528110224004" },
    { nombre: "Andrés",                empresa: "Andres Top Line",        giro: "Venta de equipo",                    telefono: "+523316077352" },
    { nombre: "Armando Zamudio",       empresa: "Particular",             giro: "Venta de equipo",                    telefono: "+525529207484",  notas: "Fundas para bocinas, productos Pioneer" },
    { nombre: "Manuel Ramírez",        empresa: "MR Audio Pro",           giro: "Venta de equipo" },
    { nombre: "Sonoritmo",             empresa: "Sonoritmo",              giro: "Venta de equipo" },
    { nombre: "Top Music",             empresa: "Top Music",              giro: "Venta de equipo" },
    { nombre: "Gerardo Estuches",      empresa: "Particular",             giro: "Venta de equipo",                    telefono: "+5214612284353", notas: "Estuches Celaya" },
    { nombre: "AP Iluminación",        empresa: "AP Iluminación",         giro: "Venta de equipo",                    telefono: "+525591642182" },
    { nombre: "Hugo Hermes",           empresa: "Hugo Hermes Music",      giro: "Venta de equipo",                    telefono: "+5215519880066" },
    { nombre: "Jorge Ramírez",         empresa: "Ventas Audio Tijuana",   giro: "Venta de equipo",                    telefono: "+525614268224" },
    { nombre: "Ao Store",              empresa: "Ao Store",               giro: "Venta de equipo" },
    { nombre: "Salvador Mata",         empresa: "Mars Pro",               giro: "Venta de equipo",                    telefono: "+524421252380" },
    { nombre: "Leo",                   empresa: "Particular",             giro: "Fabricación y renta de DJ booths",   telefono: "+525532734705" },
    // MECÁNICOS
    { nombre: "Said Mendoza",          empresa: "Said Mendoza",           giro: "Mecánico",                           telefono: "+524424468714" },
    { nombre: "Don Horacio",           empresa: "Particular",             giro: "Mecánico" },
    { nombre: "Tanis",                 empresa: "Flobe",                  giro: "Mecánico",                           telefono: "4424112401" },
    { nombre: "Kike",                  empresa: "Particular",             giro: "Mecánico" },
    { nombre: "Adrian",                empresa: "Bayern Motors",          giro: "Mecánico" },
    { nombre: "Juanjo",                empresa: "Juanjo Llantas",         giro: "Vulcanizadora",                      telefono: "+524421163670" },
    { nombre: "Rolando",               empresa: "Particular",             giro: "Vulcanizadora",                      telefono: "+524424901192" },
    // GRÚAS
    { nombre: "Grúas El Carnalito",    empresa: "GR",                     giro: "Grúas",                              telefono: "+525554341290" },
    { nombre: "Grúas Rino",            empresa: "Gruas Rino",             giro: "Grúas",                              telefono: "4426093970" },
    { nombre: "Grúas Perronas",        empresa: "Gruas Perronas",         giro: "Grúas",                              telefono: "4424735440" },
    { nombre: "Anil",                  empresa: "Anil Gruas",             giro: "Grúas",                              telefono: "4424527689" },
    { nombre: "David",                 empresa: "Compartir David",        giro: "Grúas",                              telefono: "4424656477" },
    // INSTALACIÓN
    { nombre: "Japi",                  empresa: "Mars Pro",               giro: "Instalaciones de audio e iluminación" },
    // MANTENIMIENTO
    { nombre: "Sergio Vissel",         empresa: "Vissel Electrónica",     giro: "Técnico mantenimiento" },
    { nombre: "Paulo César",           empresa: "Al Capone Producciones", giro: "Técnico mantenimiento",              telefono: "+524421445026" },
    { nombre: "Daniel Efraín",         empresa: "Particular",             giro: "Técnico mantenimiento" },
    // EMERGENCIAS
    { nombre: "Walter",                empresa: "Walter Cerrajero",       giro: "Cerrajería",                         telefono: "4421688935" },
    // PLANTAS DE LUZ
    { nombre: "Edgar",                 empresa: "Portable Generator",     giro: "Plantas de luz" },
    { nombre: "Paulino Matsumoto",     empresa: "Paulino Matsumot",       giro: "Plantas de luz",                     telefono: "+524421409775" },
    { nombre: "Tránsito",              empresa: "Particular",             giro: "Plantas de luz",                     telefono: "+5215530478848" },
    // CATERING / LIMPIEZA
    { nombre: "Edna",                  empresa: "Particular",             giro: "Catering de producción y limpieza",  telefono: "4423316478" },
    // PISTAS DE BAILE
    { nombre: "Pistas de Baile y Más", empresa: "Pistas de baile y mas",  giro: "Pistas de baile",                    telefono: "4421606427" },
    { nombre: "Andromeda",             empresa: "Andromeda",              giro: "Pistas de baile",                    telefono: "7721239890" },
    { nombre: "Pixel Dance",           empresa: "Pixel Dance",            giro: "Pistas de baile",                    telefono: "4422262959" },
  ];

  let pCount = 0;
  for (const p of proveedoresData) {
    await prisma.proveedor.create({ data: { ...p, activo: true } });
    pCount++;
  }
  console.log(`✓ Proveedores creados: ${pCount}`);

  // ─── 4. TÉCNICOS ──────────────────────────────────────────────────────────
  const tecnicosData = [
    // PRODUCCIÓN
    { nombre: "Sebastián Sáenz",          nivel: "AAA", rolNombre: "Producción" },
    // COORDINACIÓN
    { nombre: "Andrés Arroyo",            nivel: "AAA", rolNombre: "Coordinación",            comentarios: "Coordinador de eventos musicales principalmente, puede realizar coordinación de sociales y empresariales. También: Operador de Iluminación AAA, Stagehand." },
    { nombre: "Carlos Luna",              nivel: "AA",  rolNombre: "Coordinación",  celular: "+524422697815", comentarios: "También: Supervisión AAA, Operador de Video AA, Stagehand." },
    // SUPERVISIÓN
    { nombre: "Ulises Ulage",             nivel: "AAA", rolNombre: "DJ",            celular: "+5214421918343", comentarios: "Especialidad: Social. También: Coordinación A, Supervisión AA." },
    // AUDIO
    { nombre: "Hozmiry",                  nivel: "AAA", rolNombre: "Operador de Audio",        celular: "4426372961" },
    { nombre: "Rafa Gutiérrez",           nivel: "AAA", rolNombre: "Operador de Video",        celular: "+524425842680", comentarios: "También: Operador de Audio A, Stagehand." },
    { nombre: "Luis Zavala",              nivel: "AA",  rolNombre: "Operador de Audio",        celular: "(55) 51467789",  comentarios: "También: Operador de Iluminación AA, Stagehand." },
    { nombre: "Felipe Romero",            nivel: "AA",  rolNombre: "Operador de Audio",        celular: "+524432182142", comentarios: "También: Stagehand." },
    { nombre: "Oscar Joya",               nivel: "AAA", rolNombre: "Operador de Audio",        celular: "+524421865835" },
    { nombre: "Daniel Molina",            nivel: "AAA", rolNombre: "Operador de Audio",        celular: "+5214425467952" },
    { nombre: "Fabián Alcázar",           nivel: "AA",  rolNombre: "Operador de Audio",        celular: "+524422499475", comentarios: "También: Stagehand AA." },
    { nombre: "Gus",                      nivel: "AA",  rolNombre: "Operador de Audio",        celular: "4427223348" },
    { nombre: "Rubén Jaimes",             nivel: "AA",  rolNombre: "Operador de Audio",        celular: "4421473696" },
    { nombre: "Ismael Palazuelos",        nivel: "AAA", rolNombre: "Operador de Audio" },
    // ILUMINACIÓN
    { nombre: "Yhonas Sánchez",           nivel: "AAA", rolNombre: "Operador de Iluminación",  celular: "+524427525419" },
    { nombre: "Rodrigo Vera",             nivel: "AA",  rolNombre: "Operador de Iluminación",  celular: "+524428633175" },
    { nombre: "Diego Luna",               nivel: "AA",  rolNombre: "Operador de Iluminación",  celular: "+524425840086", comentarios: "También: Stagehand." },
    { nombre: "Israel Pérez",             nivel: "AAA", rolNombre: "Operador de Iluminación",  celular: "+524423209302" },
    { nombre: "Aron Padilla",             nivel: "AA",  rolNombre: "Operador de Iluminación",  celular: "4428219238",    comentarios: "También: DJ Open Format AA." },
    { nombre: "Mauricio Arpa",            nivel: "AA",  rolNombre: "Operador de Iluminación" },
    { nombre: "Luis Alberto Pérez",       nivel: "AA",  rolNombre: "Operador de Iluminación",  celular: "+524421314295", comentarios: "También: Stagehand." },
    { nombre: "Javier Pérez",             nivel: "AA",  rolNombre: "Operador de Iluminación",  celular: "4427987930",    comentarios: "También: Stagehand." },
    { nombre: "Santiago Moya",            nivel: "A",   rolNombre: "Operador de Iluminación",  celular: "+524421313484", comentarios: "También: Stagehand." },
    { nombre: "Nanes",                    nivel: "AA",  rolNombre: "Operador de Iluminación",  celular: "+524425099737" },
    // RIGGING
    { nombre: "Noé",                      nivel: "AA",  rolNombre: "Técnico de Rigging",       comentarios: "También: Stagehand AA." },
    // STAGEHAND
    { nombre: "Fabrizio",                 nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524423367954" },
    { nombre: "Lalo",                     nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+5215511923189" },
    { nombre: "Paki Arias",               nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524423534445" },
    { nombre: "Cheb",                     nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524421608295" },
    { nombre: "Alex Flores",              nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524421444823" },
    { nombre: "Rodrigo",                  nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524422199900" },
    { nombre: "Emmanuel Mane",            nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524461042287" },
    { nombre: "Carlos García",            nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "4427899757",    comentarios: "Conocido como Sock." },
    { nombre: "Ángel",                    nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+525614268224", comentarios: "Amigo de Roy." },
    { nombre: "Eduardo Sánchez",          nivel: "A",   rolNombre: "Técnico / Stagehand",      celular: "+524426106308" },
    { nombre: "Felix Nex",                nivel: "A",   rolNombre: "Técnico / Stagehand" },
    { nombre: "Alberto Ulage",            nivel: "A",   rolNombre: "Técnico / Stagehand" },
    { nombre: "Pepe Foro Arpa",           nivel: "AA",  rolNombre: "Técnico / Stagehand",      celular: "+524421869059" },
    { nombre: "Victor Oronoz",            nivel: "AA",  rolNombre: "Técnico / Stagehand",      celular: "+524421869059" },
    { nombre: "Lalo Zamora",              nivel: "AA",  rolNombre: "Técnico / Stagehand" },
    { nombre: "Carlos Efraín",            nivel: "A",   rolNombre: "Técnico / Stagehand",      comentarios: "Papá de Luna." },
    { nombre: "Isaac",                    nivel: "A",   rolNombre: "Técnico / Stagehand" },
    // DJS
    { nombre: "Juan Carlos Herrera",      nivel: "AA",  rolNombre: "DJ",            celular: "+524423439295",  comentarios: "Especialidad: Social. También: Stagehand." },
    { nombre: "Edgar Olvera",             nivel: "AA",  rolNombre: "DJ",            celular: "4423370710",     comentarios: "Especialidad: Open Format." },
    { nombre: "Arturo Muñoz",             nivel: "AAA", rolNombre: "DJ",            celular: "+524421164131",  comentarios: "Especialidad: Open Format." },
    { nombre: "Elias Yunes",              nivel: "AA",  rolNombre: "DJ",            celular: "4424324182",     comentarios: "Especialidad: Social." },
    { nombre: "Marco Pizano",             nivel: "AA",  rolNombre: "DJ",            celular: "+524423323803",  comentarios: "Especialidad: Open Format." },
    { nombre: "David Villagomez",         nivel: "AA",  rolNombre: "DJ",            celular: "4425461677",     comentarios: "Especialidad: Social." },
    { nombre: "Pablo Jasso",              nivel: "AA",  rolNombre: "DJ",            celular: "4461033680",     comentarios: "Especialidad: Open Format." },
    { nombre: "Chris Alfred",             nivel: "A",   rolNombre: "DJ",            celular: "4426531513",     comentarios: "Especialidad: Open Format." },
    { nombre: "DJ Charly Espino",         nivel: "AA",  rolNombre: "DJ",            celular: "+524422695002",  comentarios: "Especialidad: Social." },
    { nombre: "Rodrigo Díaz",             nivel: "AA",  rolNombre: "DJ",            celular: "+524425616637",  comentarios: "Especialidad: Open Format." },
    { nombre: "Antonio Flores",           nivel: "AA",  rolNombre: "DJ",            celular: "4421915951",     comentarios: "Especialidad: Social." },
  ];

  let tCount = 0;
  for (const t of tecnicosData) {
    const { rolNombre, ...rest } = t;
    await prisma.tecnico.create({
      data: { ...rest, rolId: roles[rolNombre] ?? null, activo: true },
    });
    tCount++;
  }
  console.log(`✓ Técnicos creados: ${tCount}`);

  console.log("\n🎉 Importación completada.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
