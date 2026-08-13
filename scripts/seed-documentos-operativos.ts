import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";

// Siembra los documentos operativos ancla en la tabla `politicas` (Organización).
// Idempotente: si ya existe un documento con el mismo título, no lo duplica.
// Se crean en estado BORRADOR para que Dirección los revise/publique desde la UI.
//   Uso:  ENV_FILE=.env.prod.backup npx tsx scripts/seed-documentos-operativos.ts

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw
  .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");
const sql = neon(url);

interface DocSeed {
  titulo: string;
  categoria: string;
  resumen: string;
  contenido: string;
  orden: number;
}

const IDENTIDAD = `## Propósito
Creamos experiencias que generan impacto.

## Misión
Potenciamos proyectos, artistas y marcas a través de la producción técnica impecable de sus eventos.

## Visión
Ser el aliado técnico de confianza de marcas, artistas y promotores a nivel nacional.

## Valores
Responsabilidad · Honestidad · Compromiso · Proactividad · Trabajo en equipo · Respeto · Orden · Profesionalismo · Criterio técnico · Actitud de servicio · Mejora continua · Pasión por los eventos.

## Principios rectores
Estos elementos no son aspiraciones decorativas: son la base de cómo operamos, nos comunicamos y tomamos decisiones. Cada miembro del equipo los vive en su trabajo diario.

> _Completar con las reglas de oro y los principios rectores vigentes de la empresa._`;

const COMUNICACION = `El equipo opera con canales claros para cada tipo de mensaje.

## Plataforma Mainstage
Reportes, compromisos, acuerdos, seguimiento de proyectos, KPIs, documentos y decisiones registradas.

## WhatsApp individual
Dudas operativas del día, coordinación rápida, decisiones inmediatas, emergencias.

## WhatsApp de equipo
Avisos generales, información relevante para todos, logros y reconocimientos.

## Google Meet
Juntas programadas y seguimiento urgente que no puede resolverse por texto.

## Regla de oro
**Lo que no está escrito en plataforma no existe.** Todo acuerdo relevante se documenta.`;

const REGLAMENTO = `> _Borrador base. Completar cada sección con las reglas específicas de la empresa antes de publicar._

## 1. Instalaciones, bodega y equipo
Uso y cuidado de instalaciones, bodega y equipo de la empresa.

## 2. Protocolo de cierre
Pasos obligatorios al cerrar oficina, bodega o un evento.

## 3. Uso de vehículos
Condiciones para el uso de vehículos de la empresa.

## 4. Confidencialidad de la información
Manejo y protección de datos de clientes, precios, proyectos e inventario.

## 5. Convivencia y respeto
Reglas de convivencia y trato dentro del equipo.

## 6. Horario, puntualidad y permisos
Jornada, tolerancias, permisos y ausencias.

## 7. Manejo de visitas
Protocolo para visitas a instalaciones y eventos.

## 8. Reporte de daños o pérdidas
Reporte inmediato de daños o pérdidas de equipo.`;

const DOCS: DocSeed[] = [
  { titulo: "Documento de Identidad de Empresa", categoria: "GOBIERNO", resumen: "Propósito, misión, visión, valores y principios rectores de Mainstage Producciones.", contenido: IDENTIDAD, orden: 1 },
  { titulo: "Reglamento Interno de Operación", categoria: "OPERACION", resumen: "Reglas de operación: instalaciones, bodega, equipo, cierre, vehículos, confidencialidad, horario y más.", contenido: REGLAMENTO, orden: 2 },
  { titulo: "Política de Comunicación Interna", categoria: "OPERACION", resumen: "Canales oficiales por tipo de mensaje y la regla de oro de documentación.", contenido: COMUNICACION, orden: 3 },
];

async function main() {
  let creados = 0;
  let existentes = 0;
  for (const d of DOCS) {
    const found = await sql.query(`SELECT id FROM politicas WHERE titulo = $1 LIMIT 1`, [d.titulo]);
    if (found.length) { existentes++; console.log(`= ya existe: ${d.titulo}`); continue; }
    await sql.query(
      `INSERT INTO politicas (id, titulo, categoria, resumen, contenido, version, estado, requiere_acuse, orden, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, 'BORRADOR', true, $6, now(), now())`,
      [randomUUID(), d.titulo, d.categoria, d.resumen, d.contenido, d.orden],
    );
    creados++;
    console.log(`+ creado (BORRADOR): ${d.titulo}`);
  }
  console.log(`\nListo. Creados: ${creados} · Ya existían: ${existentes}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
