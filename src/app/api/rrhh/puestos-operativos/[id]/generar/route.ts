import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import {
  jparse, procedencia, ADN_MAINSTAGE, VALORES_DEFAULT, REPORTES_BASE,
  BLOQUES_IA, type BloqueIA, type OrigenIA,
} from "@/lib/puesto";

// Genera un BORRADOR del contenido del puesto. No guarda nada: el editor lo muestra
// para revisar y aprobar.
//
// El combustible baja en cascada, de lo general a lo específico, para que un puesto
// VACANTE también se pueda generar (era la falla del generador anterior, que sólo
// leía tareas del titular y por eso dejaba en blanco justo los puestos a reclutar):
//   1. objetivo del área
//   2. descripción y entregables de cada sub-área seleccionada
//   3. plantillas del plan de trabajo de esas sub-áreas
//   4. tareas reales del titular, si lo hay
//
// Modo "refresh": sólo reescribe los bloques cuya procedencia sigue siendo IA.
// Lo que el usuario escribió o editó a mano se respeta y se reporta en `respetados`.

const SYSTEM_PROMPT = `Eres especialista en diseño organizacional para Mainstage Producciones, empresa mexicana de producción técnica de eventos (audio, iluminación y video).

Recibes el objetivo del área, las sub-áreas que abarca un puesto con sus entregables, las plantillas del plan de trabajo de esas sub-áreas y —si el puesto está ocupado— las tareas reales de su titular. De ahí destilas la definición del puesto.

Reglas de redacción:
- Español de México, claro y concreto, con el lenguaje de la operación (montaje, rider, evento, cliente, proveedor).
- RESPONSABILIDADES: enunciados permanentes de lo que la persona es responsable de LOGRAR. No copies títulos de tareas: agrupa y sube de nivel. Entre 5 y 8.
- CRITERIOS DE CALIDAD: por cada responsabilidad clave, cómo se verifica que está bien hecha. Deben ser observables y medibles; prohibido "adecuadamente", "correctamente", "en tiempo y forma", "oportunamente". Marca noNegociable:true en los 2 o 3 que, de fallar, comprometen el evento, el dinero o la relación con el cliente.
- RESULTADOS CLAVE (KPIs): exactamente UNO por sub-área recibida, y mínimo 3 en total (si hay menos sub-áreas, completa con resultados del área). Cada uno con una meta numérica concreta y una fuente. Usa fuenteTipo "automatica" sólo si el dato sale de un módulo del sistema que te mencionen; si no, "manual".
- REPORTES: lo que esta persona entrega a su jefe. Parte de los tres de base que te doy y ajústalos o agrega uno propio del puesto (máximo 5).
- APTITUDES y CONOCIMIENTOS: específicos del puesto. NO repitas la base común de la empresa (pasión por los eventos, proponer, crecer) — eso ya está implícito para todos y no debe aparecer aquí.
- No inventes funciones que no se desprendan del insumo. Si un insumo viene vacío, apóyate en el nivel superior (sub-área, y si no, área).

Responde ÚNICAMENTE con JSON válido, sin markdown ni explicación, con esta forma exacta:
{
  "misionPuesto": "1-2 oraciones: para qué existe el puesto",
  "responsabilidades": ["string"],
  "estandares": [{ "subarea": "string", "responsabilidad": "string", "estandar": "string", "noNegociable": false }],
  "kpis": [{ "nombre": "string", "resultadoEsperado": "string", "unidad": "%|$|número|días|ratio", "meta": "string", "frecuencia": "semanal|mensual|trimestral", "fuenteTipo": "automatica|manual", "fuente": "string" }],
  "reportes": [{ "nombre": "string", "frecuencia": "diaria|semanal|mensual|por_evento", "formato": "string" }],
  "aptitudes": [{ "nombre": "string", "nivel": "basico|intermedio|avanzado" }],
  "conocimientos": [{ "nombre": "string", "nivel": "basico|intermedio|avanzado", "indispensable": true }]
}`;

function extractJson(text: string): Record<string, unknown> {
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Respuesta sin JSON");
  return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
}

const str = (v: unknown) => String(v ?? "").trim();
const lista = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const objs = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter(x => x && typeof x === "object") : []);
const unoDe = <T extends string>(v: unknown, ops: readonly T[], def: T): T =>
  (ops as readonly string[]).includes(str(v)) ? (str(v) as T) : def;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const modo: "completo" | "refresh" = body?.modo === "refresh" ? "refresh" : "completo";

  const puesto = await prisma.puesto.findUnique({
    where: { id },
    select: {
      nombre: true, area: true, misionPuesto: true, origenIA: true,
      reportaA: { select: { nombre: true } },
      subAreas: {
        orderBy: [{ principal: "desc" }, { orden: "asc" }],
        select: { subAreaId: true },
      },
      ocupantes: { where: { activo: true }, select: { nombre: true, userId: true } },
    },
  });
  if (!puesto) return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });

  // El editor puede mandar la selección todavía sin guardar; si no, usamos la del puesto.
  const subAreaIds: string[] = Array.isArray(body?.subAreaIds) && body.subAreaIds.length
    ? body.subAreaIds.filter((x: unknown): x is string => typeof x === "string")
    : puesto.subAreas.map(s => s.subAreaId);

  const origen = jparse<OrigenIA>(puesto.origenIA, {});
  // En refresh sólo se tocan los bloques que siguen siendo 100% IA.
  const regenerar: BloqueIA[] = modo === "completo"
    ? [...BLOQUES_IA]
    : BLOQUES_IA.filter(b => procedencia(origen, b) === "IA");
  const respetados = BLOQUES_IA.filter(b => !regenerar.includes(b));

  if (modo === "refresh" && regenerar.length === 0) {
    return NextResponse.json({
      mensaje: "Todo el contenido de este puesto es manual o fue editado a mano; no hay nada que refrescar.",
      respetados, regenerar: [], borrador: null,
    });
  }

  const area = await prisma.pTArea.findFirst({
    where: { codigo: puesto.area },
    select: { nombre: true, objetivo: true },
  });
  const subAreas = subAreaIds.length
    ? await prisma.pTSubArea.findMany({
        where: { id: { in: subAreaIds } },
        select: { id: true, nombre: true, descripcion: true, entregables: true },
      })
    : [];
  // Respeta el orden en que vienen (el primero es el principal).
  subAreas.sort((a, b) => subAreaIds.indexOf(a.id) - subAreaIds.indexOf(b.id));

  const plantillas = subAreaIds.length
    ? await prisma.pTTareaTemplate.findMany({
        where: { subAreaId: { in: subAreaIds }, activa: true },
        select: {
          nombre: true, descripcion: true, porqueSeHace: true, estandarMinimo: true,
          siNoSeHace: true, impacto: true, frecuencia: true, kpiNombre: true,
          moduloDestino: true, subAreaId: true,
        },
        take: 200,
      })
    : [];

  const userIds = puesto.ocupantes.map(o => o.userId).filter((u): u is string => !!u);
  const tareas = userIds.length
    ? await prisma.tarea.findMany({
        where: {
          asignadoAId: { in: userIds },
          OR: [{ tipoOrigen: "PLAN" }, { origenPlan: true }, { ptTemplateId: { not: null } }],
        },
        select: { titulo: true, descripcion: true, porqueSeHace: true, estandarMinimo: true },
        take: 150,
      })
    : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada en el entorno." },
      { status: 503 },
    );
  }

  const bloqueSub = subAreas.map((s, i) => {
    const suyas = plantillas.filter(p => p.subAreaId === s.id);
    const lineas = suyas.map(p => [
      `  • ${p.nombre} (${p.frecuencia.toLowerCase()}, impacto ${p.impacto})`,
      p.descripcion ? `    qué: ${p.descripcion}` : "",
      p.porqueSeHace ? `    por qué: ${p.porqueSeHace}` : "",
      p.estandarMinimo ? `    estándar: ${p.estandarMinimo}` : "",
      p.siNoSeHace ? `    si no se hace: ${p.siNoSeHace}` : "",
      p.kpiNombre ? `    indicador asociado: ${p.kpiNombre}` : "",
      p.moduloDestino ? `    módulo del sistema: ${p.moduloDestino}` : "",
    ].filter(Boolean).join("\n"));
    return [
      `## Sub-área ${i + 1}: ${s.nombre}${i === 0 ? " (PRINCIPAL)" : ""}`,
      s.descripcion ? `Qué cubre: ${s.descripcion}` : "",
      s.entregables.length ? `Entregables: ${s.entregables.join(", ")}` : "",
      lineas.length
        ? `Plantillas del plan de trabajo (${suyas.length}):\n${lineas.join("\n")}`
        : "Sin plantillas del plan todavía: deriva las responsabilidades de los entregables y del objetivo del área.",
    ].filter(Boolean).join("\n");
  });

  const bloqueTitular = tareas.length
    ? `## Tareas reales que hoy ejecuta ${puesto.ocupantes.map(o => o.nombre).join(", ")}\n` +
      tareas.map(t => [
        `  • ${t.titulo}`,
        t.descripcion ? `    qué: ${t.descripcion}` : "",
        t.porqueSeHace ? `    por qué: ${t.porqueSeHace}` : "",
        t.estandarMinimo ? `    estándar: ${t.estandarMinimo}` : "",
      ].filter(Boolean).join("\n")).join("\n")
    : "";

  const userPrompt = [
    `Puesto: ${puesto.nombre}`,
    `Área: ${area?.nombre ?? puesto.area}`,
    area?.objetivo ? `Objetivo del área: ${area.objetivo}` : "",
    puesto.reportaA ? `Reporta a: ${puesto.reportaA.nombre}` : "Reporta a: Dirección general",
    puesto.ocupantes.length ? `Estado: ocupado` : `Estado: VACANTE (se va a reclutar)`,
    "",
    `Base común que YA aplica a todos y no debes repetir: ${ADN_MAINSTAGE.texto}`,
    `Valores de la empresa (tampoco los repitas como aptitudes): ${VALORES_DEFAULT.map(v => v.nombre).join(", ")}.`,
    "",
    `Reportes de base a ajustar:\n${REPORTES_BASE.map(r => `  • ${r.nombre} (${r.frecuencia}, ${r.formato})`).join("\n")}`,
    "",
    bloqueSub.length ? bloqueSub.join("\n\n") : "## Sin sub-áreas asignadas: deriva todo del objetivo del área.",
    bloqueTitular,
    "",
    `Genera EXACTAMENTE ${Math.max(3, subAreas.length)} resultados clave (KPIs)${subAreas.length >= 3 ? ", uno por sub-área" : ""}.`,
  ].filter(Boolean).join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = msg.content.filter(c => c.type === "text").map(c => (c as { text: string }).text).join("");
    const d = extractJson(text);

    const completo = {
      misionPuesto: str(d.misionPuesto),
      responsabilidades: lista(d.responsabilidades),
      estandares: objs(d.estandares).map(e => ({
        subarea: str(e.subarea),
        responsabilidad: str(e.responsabilidad),
        estandar: str(e.estandar),
        noNegociable: e.noNegociable === true,
      })).filter(e => e.responsabilidad || e.estandar),
      kpis: objs(d.kpis).map(k => ({
        nombre: str(k.nombre),
        resultadoEsperado: str(k.resultadoEsperado),
        unidad: unoDe(k.unidad, ["%", "$", "número", "días", "ratio"] as const, "%"),
        meta: str(k.meta),
        frecuencia: unoDe(k.frecuencia, ["semanal", "mensual", "trimestral"] as const, "mensual"),
        fuenteTipo: unoDe(k.fuenteTipo, ["automatica", "manual"] as const, "manual"),
        fuente: str(k.fuente),
      })).filter(k => k.nombre),
      reportes: objs(d.reportes).map(r => ({
        nombre: str(r.nombre),
        frecuencia: unoDe(r.frecuencia, ["diaria", "semanal", "mensual", "por_evento"] as const, "semanal"),
        formato: str(r.formato),
      })).filter(r => r.nombre).slice(0, 5),
      perfil: {
        aptitudes: objs(d.aptitudes).map(a => ({
          nombre: str(a.nombre),
          nivel: unoDe(a.nivel, ["basico", "intermedio", "avanzado"] as const, "intermedio"),
        })).filter(a => a.nombre),
        conocimientos: objs(d.conocimientos).map(c => ({
          nombre: str(c.nombre),
          nivel: unoDe(c.nivel, ["basico", "intermedio", "avanzado"] as const, "intermedio"),
          indispensable: c.indispensable === true,
        })).filter(c => c.nombre),
      },
    };

    // En refresh se devuelven sólo los bloques autorizados a reescribirse.
    const borrador: Partial<typeof completo> = {};
    for (const b of regenerar) borrador[b] = completo[b] as never;

    return NextResponse.json({
      borrador,
      regenerar,
      respetados,
      insumo: {
        objetivoArea: !!area?.objetivo,
        subAreas: subAreas.length,
        plantillas: plantillas.length,
        tareasTitular: tareas.length,
      },
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error("[puestos-operativos/generar]", m);
    return NextResponse.json({ error: `No se pudo generar el borrador: ${m}` }, { status: 500 });
  }
}
