/**
 * Importador idempotente de docs/reclutamiento-produccion/reclutamiento-produccion-seed.json
 * (Reclutamiento de Producción, Fase 3 — spec §7/§9).
 *
 * Correr re-ejecutando este script NO debe duplicar nada:
 *  - El formulario se crea una sola vez (se busca por slug; si ya existe, no se toca
 *    su contenido para no pisar ediciones hechas desde el constructor).
 *  - Los roles del tabulador que falten (Operador de Rigging, Ingeniero de Rigging)
 *    se crean sin tarifa, marcados tarifa_pendiente=true; las tarifas de los roles
 *    existentes NUNCA se modifican.
 *  - El campo `perfil` de cada rol referenciado se sobreescribe con el contenido
 *    del seed en cada corrida (es un campo nuevo de esta fase, no hay edición manual
 *    previa que proteger).
 *  - La vinculación formulario↔puesto se resuelve por nombre exacto; si el puesto
 *    todavía no existe con su nombre nuevo (ver abajo), simplemente no se liga esa vez.
 *
 * El renombre "Coordinador de producción" → "Jefe de Producción" y la fusión de los
 * dos "Auxiliar de producción" en "Encargado de Bodega" tocan datos de producción con
 * titulares reales. Por eso van en una función aparte que, por default, SOLO reporta
 * el plan (dry-run); se ejecuta de verdad pasando --aplicar-puestos, y esa bandera
 * solo debe usarse después de que el Director confirme (spec §0.4 / §9 Fase 3).
 *
 * Correr con: npx tsx scripts/importar-reclutamiento-seed.ts [--aplicar-puestos]
 */
import { readFileSync, writeFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const seed = JSON.parse(
  readFileSync("docs/reclutamiento-produccion/reclutamiento-produccion-seed.json", "utf8"),
);

const jstr = (v: unknown) => (v == null ? null : JSON.stringify(v));

// ── 1. Formulario (idempotente por slug) ───────────────────────────────────

async function importarFormulario() {
  const f = seed.formularios[0];
  const existente = (await sql.query(`SELECT id FROM formularios WHERE slug = $1`, [f.slug])) as { id: string }[];
  if (existente.length > 0) {
    console.log(`· formulario '${f.slug}' ya existe (${existente[0].id}) — no se modifica su contenido`);
    return;
  }

  const formularioId = randomUUID();
  await sql.query(
    `INSERT INTO formularios (id, slug, titulo, descripcion, estado, acepta_respuestas, umbral_avanza, umbral_banco, mensaje_confirmacion, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'BORRADOR', true, $5, $6, $7, now(), now())`,
    [
      formularioId,
      f.slug,
      f.titulo,
      f.descripcion ?? null,
      seed.config?.umbrales?.avanza ?? 75,
      seed.config?.umbrales?.banco ?? 50,
      f.mensajeConfirmacion ?? null,
    ],
  );
  console.log(`· formulario '${f.slug}' creado (${formularioId})`);

  let ordenSeccion = 0;
  for (const s of f.secciones) {
    const seccionId = randomUUID();
    await sql.query(
      `INSERT INTO formulario_secciones (id, formulario_id, orden, codigo_bloque, bloque, titulo, descripcion, mostrar_si, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [seccionId, formularioId, ordenSeccion++, s.id, s.bloque ?? null, s.titulo, s.descripcion ?? null, jstr(s.mostrarSi ?? null)],
    );
    let ordenPregunta = 0;
    for (const p of s.preguntas) {
      await sql.query(
        `INSERT INTO formulario_preguntas (id, seccion_id, orden, codigo, texto, ayuda, tipo, obligatoria, opciones, mostrar_si, valoracion, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
        [
          randomUUID(),
          seccionId,
          ordenPregunta++,
          p.codigo ?? null,
          p.texto,
          p.ayuda ?? null,
          p.tipo,
          p.obligatoria !== false,
          jstr(p.opciones ?? null),
          jstr(p.mostrarSi ?? null),
          jstr(p.valoracion ?? null),
        ],
      );
    }
  }
  console.log(`  ${f.secciones.length} secciones importadas`);
}

async function vincularFormularioPuestos() {
  const f = seed.formularios[0];
  const formulario = (await sql.query(`SELECT id FROM formularios WHERE slug = $1`, [f.slug])) as { id: string }[];
  if (formulario.length === 0) return;
  const formularioId = formulario[0].id;

  for (const nombrePuesto of f.puestosVinculados as string[]) {
    const puesto = (await sql.query(`SELECT id FROM puestos WHERE nombre = $1`, [nombrePuesto])) as { id: string }[];
    if (puesto.length === 0) {
      console.log(`· '${nombrePuesto}' no existe todavía como puesto — se liga en una corrida futura`);
      continue;
    }
    const existente = (await sql.query(
      `SELECT id FROM formulario_puestos WHERE formulario_id = $1 AND puesto_id = $2`,
      [formularioId, puesto[0].id],
    )) as { id: string }[];
    if (existente.length > 0) continue;
    await sql.query(
      `INSERT INTO formulario_puestos (id, formulario_id, puesto_id) VALUES ($1, $2, $3)`,
      [randomUUID(), formularioId, puesto[0].id],
    );
    console.log(`· formulario vinculado a '${nombrePuesto}'`);
  }
}

// ── 2. Roles del tabulador + perfil técnico ─────────────────────────────────

async function importarRolesYPerfiles() {
  for (const bloque of seed.perfilesTecnicos) {
    const categorias = Array.isArray(bloque.categoriaTabulador) ? bloque.categoriaTabulador : [bloque.categoriaTabulador];
    for (const nivel of bloque.niveles) {
      const existente = (await sql.query(`SELECT id FROM roles_tecnicos WHERE nombre = $1`, [nivel.rolTabulador])) as { id: string }[];
      let rolId: string;
      if (existente.length > 0) {
        rolId = existente[0].id;
      } else {
        rolId = randomUUID();
        // Rol nuevo: disciplina es la primera categoría del bloque (p.ej. RIGGING).
        const disciplinaNueva = categorias[categorias.length - 1];
        const maxOrden = (await sql.query(`SELECT COALESCE(MAX(orden), 0) AS m FROM roles_tecnicos`)) as { m: number }[];
        await sql.query(
          `INSERT INTO roles_tecnicos (id, nombre, disciplina, "tipoPago", tarifa_pendiente, activo, orden)
           VALUES ($1, $2, $3, 'POR_JORNADA', true, true, $4)`,
          [rolId, nivel.rolTabulador, disciplinaNueva, (maxOrden[0]?.m ?? 0) + 1],
        );
        console.log(`· rol '${nivel.rolTabulador}' creado sin tarifa (tarifa pendiente)`);
      }

      const perfil = {
        disciplina: bloque.disciplina,
        nivel: nivel.nivel,
        proposito: nivel.proposito,
        competencias: nivel.competencias ?? [],
        competenciasComunes: bloque.competenciasComunes ?? [],
        criteriosExclusion: bloque.criteriosExclusion ?? [],
        rolesRelacionados: nivel.rolesRelacionados ?? [],
      };
      await sql.query(`UPDATE roles_tecnicos SET perfil = $1 WHERE id = $2`, [jstr(perfil), rolId]);
    }
  }
  console.log("· perfiles técnicos actualizados en todos los roles referenciados por el seed");
}

// ── 3. Puestos: renombrar Jefe de Producción + fusionar Encargado de Bodega ─
// Toca datos con titulares reales — ver dry-run antes de aplicar.

interface PlanPuestos {
  jefeId: string;
  auxiliarSobreviveId: string;
  auxiliarDuplicadoId: string;
}

async function resolverPlanPuestos(): Promise<PlanPuestos | null> {
  const coordinador = (await sql.query(`SELECT id FROM puestos WHERE nombre = 'Coordinador de producción'`)) as { id: string }[];
  const auxiliares = (await sql.query(
    `SELECT pi.id, (SELECT count(*) FROM personal_interno WHERE puesto_id = pi.id) AS ocupantes
       FROM puestos pi WHERE pi.nombre = 'Auxiliar de producción' ORDER BY pi.id`,
  )) as { id: string; ocupantes: number }[];

  if (coordinador.length === 0 && auxiliares.length === 0) {
    console.log("· ya no quedan 'Coordinador de producción' ni 'Auxiliar de producción' — migración ya aplicada");
    return null;
  }
  if (coordinador.length === 0 || auxiliares.length !== 2) {
    console.log(`· estado inesperado (coordinador: ${coordinador.length}, auxiliares: ${auxiliares.length}) — revisar a mano antes de continuar`);
    return null;
  }
  // Sobrevive el que tenga más ocupantes activos; si hay empate, el primero por id.
  const [a, b] = auxiliares;
  const sobrevive = a.ocupantes >= b.ocupantes ? a : b;
  const duplicado = sobrevive === a ? b : a;
  return { jefeId: coordinador[0].id, auxiliarSobreviveId: sobrevive.id, auxiliarDuplicadoId: duplicado.id };
}

const jefeData = seed.puestos.find((p: any) => p.nombre === "Jefe de Producción");
const bodegaData = seed.puestos.find((p: any) => p.nombre === "Encargado de Bodega");

const TABLAS_CON_PUESTO_ID = [
  "actas_administrativas",
  "documentos_laborales",
  "evaluaciones_empleado",
  "onboarding_planes",
  "personal_interno",
  "postulaciones",
  "pt_kpis",
  "puesto_subareas",
];

async function reportarMigracionPuestos() {
  const plan = await resolverPlanPuestos();
  if (!plan) return;

  const ocupantesDup = (await sql.query(`SELECT nombre FROM personal_interno WHERE puesto_id = $1`, [plan.auxiliarDuplicadoId])) as { nombre: string }[];
  const ocupantesSobrevive = (await sql.query(`SELECT nombre FROM personal_interno WHERE puesto_id = $1`, [plan.auxiliarSobreviveId])) as { nombre: string }[];

  console.log("\n⚠ PLAN DE MIGRACIÓN DE PUESTOS (dry-run — requiere confirmación del Director)\n");
  console.log(`1. Renombrar 'Coordinador de producción' (${plan.jefeId}) → 'Jefe de Producción'`);
  console.log(`   + criteriosExclusion y vacanteAbierta=true desde el seed`);
  console.log(`2. Renombrar 'Auxiliar de producción' (${plan.auxiliarSobreviveId}, titular: ${ocupantesSobrevive.map((o) => o.nombre).join(", ") || "—"}) → 'Encargado de Bodega'`);
  console.log(`   + reportaA = Jefe de Producción, criteriosExclusion y vacanteAbierta=true`);
  console.log(`3. Reasignar referencias de 'Auxiliar de producción' duplicado (${plan.auxiliarDuplicadoId}, titular: ${ocupantesDup.map((o) => o.nombre).join(", ") || "—"}) al puesto sobreviviente, en: ${TABLAS_CON_PUESTO_ID.join(", ")}`);
  console.log(`4. Desactivar (activo=false) el puesto duplicado sin borrarlo`);
  console.log("\nPara ejecutar de verdad: npx tsx scripts/importar-reclutamiento-seed.ts --aplicar-puestos\n");
}

async function aplicarMigracionPuestos() {
  const plan = await resolverPlanPuestos();
  if (!plan) return;

  // Backup de los 3 puestos afectados antes de mutar.
  const backup = (await sql.query(
    `SELECT * FROM puestos WHERE id IN ($1, $2, $3)`,
    [plan.jefeId, plan.auxiliarSobreviveId, plan.auxiliarDuplicadoId],
  )) as unknown[];
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `scripts/_backup-puestos-reclutamiento-${ts}.json`;
  writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`Backup de puestos afectados → ${backupFile}`);

  await sql.query(
    `UPDATE puestos SET nombre = 'Jefe de Producción', criterios_exclusion = $1, vacante_abierta = true, updated_at = now() WHERE id = $2`,
    [jstr(jefeData?.criteriosExclusion ?? []), plan.jefeId],
  );
  console.log("· 'Coordinador de producción' renombrado a 'Jefe de Producción'");

  await sql.query(
    `UPDATE puestos SET nombre = 'Encargado de Bodega', reporta_a_id = $1, criterios_exclusion = $2, vacante_abierta = true, updated_at = now() WHERE id = $3`,
    [plan.jefeId, jstr(bodegaData?.criteriosExclusion ?? []), plan.auxiliarSobreviveId],
  );
  console.log("· 'Auxiliar de producción' (sobreviviente) renombrado a 'Encargado de Bodega'");

  for (const tabla of TABLAS_CON_PUESTO_ID) {
    await sql.query(
      `UPDATE ${tabla} SET puesto_id = $1 WHERE puesto_id = $2`,
      [plan.auxiliarSobreviveId, plan.auxiliarDuplicadoId],
    );
    console.log(`· ${tabla}: referencias reasignadas`);
  }
  await sql.query(
    `UPDATE puestos SET activo = false, reporta_a_id = NULL, nombre = 'Auxiliar de producción (fusionado, inactivo)', updated_at = now() WHERE id = $1`,
    [plan.auxiliarDuplicadoId],
  );
  console.log("· puesto duplicado desactivado (soft delete)");

  await vincularFormularioPuestos();
}

async function main() {
  await importarFormulario();
  await vincularFormularioPuestos();
  await importarRolesYPerfiles();

  if (process.argv.includes("--aplicar-puestos")) {
    await aplicarMigracionPuestos();
  } else {
    await reportarMigracionPuestos();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
