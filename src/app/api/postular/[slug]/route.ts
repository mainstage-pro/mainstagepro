import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pregPublica, parseJSON, type MostrarSi } from "@/lib/formularios";
import { evaluarRespuesta, construirEntrada, type FilaRespuestaCruda, type FilaSeccionCruda } from "@/lib/valoracion-formulario";
import crypto from "crypto";

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const f = await prisma.formulario.findUnique({
    where: { slug },
    include: {
      secciones: {
        where: { archivada: false },
        orderBy: { orden: "asc" },
        include: { preguntas: { where: { archivada: false }, orderBy: { orden: "asc" } } },
      },
    },
  });

  if (!f || f.estado !== "PUBLICADO" || !f.aceptaRespuestas) {
    return NextResponse.json({
      error: "cerrado",
      titulo: f?.titulo ?? null,
      mensaje: "Esta convocatoria no está recibiendo postulaciones.",
    }, { status: 404 });
  }

  return NextResponse.json({
    formulario: {
      id: f.id,
      slug: f.slug,
      titulo: f.titulo,
      descripcion: f.descripcion,
      imagenUrl: f.imagenUrl,
      mensajeConfirmacion: f.mensajeConfirmacion,
      secciones: f.secciones.map((s) => ({
        id: s.id,
        orden: s.orden,
        titulo: s.titulo,
        descripcion: s.descripcion,
        mostrarSi: parseJSON<MostrarSi>(s.mostrarSi, null),
        preguntas: s.preguntas.map(pregPublica),
      })),
    },
  });
}

// Rate-limit en memoria sencillo (por IP): 5 envíos por 10 minutos.
// Nota (Fase 1): no persiste entre instancias serverless; suficiente para
// disuadir envíos repetidos obvios. En Fase 2/3 valdría la pena mover a Redis
// o a una tabla de rate-limit.
const ENVIOS_RECIENTES = new Map<string, number[]>();
function dejaPasar(ip: string): boolean {
  const ahora = Date.now();
  const ventana = 10 * 60 * 1000;
  const previos = (ENVIOS_RECIENTES.get(ip) ?? []).filter((t) => ahora - t < ventana);
  if (previos.length >= 5) {
    ENVIOS_RECIENTES.set(ip, previos);
    return false;
  }
  previos.push(ahora);
  ENVIOS_RECIENTES.set(ip, previos);
  return true;
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")
    || "0.0.0.0";

  if (!dejaPasar(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  // Honeypot: campo oculto que nunca debería llegar lleno.
  if (body.__botbait) {
    return NextResponse.json({ ok: true, honeypot: true });
  }

  const f = await prisma.formulario.findUnique({
    where: { slug },
    include: {
      secciones: {
        where: { archivada: false },
        include: { preguntas: { where: { archivada: false } } },
      },
    },
  });
  if (!f || f.estado !== "PUBLICADO" || !f.aceptaRespuestas) {
    return NextResponse.json({ error: "El formulario no está recibiendo respuestas." }, { status: 404 });
  }

  const respuestasEntrada: Record<string, unknown> = body.respuestas && typeof body.respuestas === "object" ? body.respuestas : {};
  const preguntasPorId = new Map(f.secciones.flatMap((s) => s.preguntas.map((p) => [p.id, { seccion: s, pregunta: p }])));

  // Validación server-side de obligatorias (considerando mostrarSi).
  const { seMuestra } = await import("@/lib/formularios");
  const seccionesVisibles = new Set<string>();
  for (const s of f.secciones) {
    const cond = parseJSON<MostrarSi>(s.mostrarSi, null);
    if (seMuestra(cond, respuestasEntrada)) seccionesVisibles.add(s.id);
  }

  for (const s of f.secciones) {
    if (!seccionesVisibles.has(s.id)) continue;
    for (const p of s.preguntas) {
      const cond = parseJSON<MostrarSi>(p.mostrarSi, null);
      if (!seMuestra(cond, respuestasEntrada)) continue;
      if (!p.obligatoria) continue;
      const v = respuestasEntrada[p.id];
      const vacio = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (vacio) {
        return NextResponse.json(
          { error: `Falta responder: ${p.texto}`, preguntaId: p.id },
          { status: 400 }
        );
      }
    }
  }

  // Crear respuesta + snapshots.
  const respuesta = await prisma.formularioRespuesta.create({
    data: {
      formularioId: f.id,
      ipHash: hashIp(ip),
      respuestasPreguntas: {
        create: Array.from(preguntasPorId.entries())
          .filter(([pid]) => {
            const { seccion, pregunta } = preguntasPorId.get(pid)!;
            if (!seccionesVisibles.has(seccion.id)) return false;
            const cond = parseJSON<MostrarSi>(pregunta.mostrarSi, null);
            if (!seMuestra(cond, respuestasEntrada)) return false;
            return pid in respuestasEntrada;
          })
          .map(([pid, { pregunta }]) => ({
            preguntaId: pid,
            valor: JSON.stringify(respuestasEntrada[pid] ?? null),
            snapshotPregunta: JSON.stringify({
              codigo: pregunta.codigo,
              texto: pregunta.texto,
              tipo: pregunta.tipo,
              opciones: parseJSON<string[]>(pregunta.opciones, []),
              valoracion: parseJSON<unknown>(pregunta.valoracion, null),
            }),
          })),
      },
    },
    include: {
      respuestasPreguntas: {
        include: { pregunta: { select: { id: true, seccionId: true, mostrarSi: true } } },
      },
    },
  });

  // Motor de valoración y persistencia de los puntajes.
  const filasRespuesta: FilaRespuestaCruda[] = respuesta.respuestasPreguntas.map((rp) => ({
    id: rp.id,
    preguntaId: rp.preguntaId,
    valor: rp.valor,
    snapshotPregunta: rp.snapshotPregunta,
    calificacionManual: rp.calificacionManual,
    pregunta: rp.pregunta,
  }));
  const filasSeccion: FilaSeccionCruda[] = f.secciones.map((s) => ({ id: s.id, bloque: s.bloque, mostrarSi: s.mostrarSi }));
  const entrada = construirEntrada(filasRespuesta, filasSeccion, f.umbralAvanza, f.umbralBanco);
  const resultado = evaluarRespuesta(entrada);

  // Puntos por pregunta → RespuestaPregunta.puntosAuto.
  await Promise.all(
    respuesta.respuestasPreguntas.map((rp) => {
      const puntos = resultado.puntosPorPregunta[rp.preguntaId]?.obtenidos ?? 0;
      return prisma.respuestaPregunta.update({ where: { id: rp.id }, data: { puntosAuto: puntos } });
    }),
  );

  await prisma.formularioRespuesta.update({
    where: { id: respuesta.id },
    data: {
      excluido: resultado.excluido,
      motivoExclusion: resultado.motivoExclusion
        ? `${resultado.motivoExclusion.codigo ?? ""} ${resultado.motivoExclusion.texto} → ${resultado.motivoExclusion.respuesta}`.trim()
        : null,
      puntosObtenidos: resultado.puntosObtenidos,
      puntosPosibles: resultado.puntosPosibles,
      porcentajePreliminar: resultado.porcentajePreliminar,
      porcentajeFinal: resultado.porcentajeFinal,
      banda: resultado.banda,
      desglose: JSON.stringify(resultado.desglose),
      nivelSugerido: resultado.nivelSugerido,
    },
  });

  // Alta/actualización automática de candidato y postulación.
  await altaCandidatoDesdeRespuesta(respuesta.id, f.id, respuestasEntrada, respuesta.respuestasPreguntas, resultado);

  return NextResponse.json({
    ok: true,
    id: respuesta.id,
    mensaje: f.mensajeConfirmacion ?? "Gracias, recibimos tu postulación.",
  });
}

// ─── Alta automática de candidato ─────────────────────────────────────────
//
// Heurística para derivar disciplina y nivel: buscamos preguntas con códigos
// 5.1 (puesto), 5.2 (disciplina) y 5.3 (nivel) del formulario base, pero
// aceptamos cualquier pregunta visible cuyo snapshot.codigo empiece con esos
// números. Nombre/correo/teléfono/ciudad se intentan por códigos 1.1, 1.2a,
// 1.2b, 1.4. Si no se pueden derivar, se dejan en null (política "antes null
// que inventar datos").
//
// Dedup: por teléfono normalizado (solo dígitos) o correo en minúsculas. Si
// hay match, se actualizan los datos existentes y se agrega otra postulación.

interface SnapshotMini { codigo: string | null; texto: string; tipo: string }
interface RpSnapshot {
  preguntaId: string;
  valor: string | null;
  snapshotPregunta: string;
}

function leerValorPorCodigo(
  codigos: string[],
  respuestas: Record<string, unknown>,
  respPreg: RpSnapshot[],
): string | null {
  // Primero el shortcut: respuestasEntrada se indexa por preguntaId; buscamos el
  // snapshot que tenga ese código y traducimos id→valor.
  for (const rp of respPreg) {
    const snap = parseJSON<SnapshotMini>(rp.snapshotPregunta, { codigo: null, texto: "", tipo: "" });
    if (!snap.codigo) continue;
    if (!codigos.includes(snap.codigo)) continue;
    const v = parseJSON<unknown>(rp.valor, null);
    if (v == null) continue;
    if (Array.isArray(v)) return v.map(String).join(", ");
    if (typeof v === "boolean") return v ? "Sí" : "No";
    return String(v);
  }
  // Fallback por si el cliente mandó la respuesta indexada por código.
  for (const c of codigos) {
    const v = respuestas[c];
    if (v != null) return Array.isArray(v) ? v.join(", ") : String(v);
  }
  return null;
}

async function altaCandidatoDesdeRespuesta(
  respuestaId: string,
  formularioId: string,
  respuestasEntrada: Record<string, unknown>,
  respuestasPreguntas: RpSnapshot[],
  resultado: ReturnType<typeof evaluarRespuesta>,
) {
  const nombre = leerValorPorCodigo(["1.1"], respuestasEntrada, respuestasPreguntas);
  if (!nombre) return; // sin nombre no hay forma de crear candidato

  const telefonoRaw = leerValorPorCodigo(["1.2a", "1.2"], respuestasEntrada, respuestasPreguntas);
  const correoRaw = leerValorPorCodigo(["1.2b", "1.3b", "1.2"], respuestasEntrada, respuestasPreguntas);
  const ciudad = leerValorPorCodigo(["1.4"], respuestasEntrada, respuestasPreguntas);
  const puestoResp = leerValorPorCodigo(["5.1"], respuestasEntrada, respuestasPreguntas);
  const disciplinaResp = leerValorPorCodigo(["5.2"], respuestasEntrada, respuestasPreguntas);
  const nivelResp = leerValorPorCodigo(["5.3"], respuestasEntrada, respuestasPreguntas);

  const telefonoDig = telefonoRaw ? telefonoRaw.replace(/\D/g, "") : null;
  const correo = correoRaw ? correoRaw.trim().toLowerCase() : null;

  // Dedup por teléfono o correo
  let candidato = null as Awaited<ReturnType<typeof prisma.candidato.findFirst>> | null;
  if (telefonoDig) {
    candidato = await prisma.candidato.findFirst({ where: { telefono: { contains: telefonoDig } } });
  }
  if (!candidato && correo) {
    candidato = await prisma.candidato.findFirst({ where: { correo: { equals: correo, mode: "insensitive" } } });
  }

  if (candidato) {
    await prisma.candidato.update({
      where: { id: candidato.id },
      data: {
        nombre: candidato.nombre || nombre,
        correo: candidato.correo ?? correo,
        telefono: candidato.telefono ?? telefonoRaw,
        ciudad: candidato.ciudad ?? ciudad,
      },
    });
  } else {
    candidato = await prisma.candidato.create({
      data: {
        nombre,
        correo: correo ?? null,
        telefono: telefonoRaw ?? null,
        ciudad: ciudad ?? null,
      },
    });
  }

  // Vincular respuesta ↔ candidato (campo ya existe).
  await prisma.formularioRespuesta.update({
    where: { id: respuestaId },
    data: { candidatoId: candidato.id },
  });

  // Intentar ligar al Puesto operativo por nombre (Jefe de Producción / Encargado de Bodega).
  let puestoId: string | null = null;
  if (puestoResp) {
    const match = await prisma.puesto.findFirst({
      where: { nombre: { equals: puestoResp, mode: "insensitive" } },
      select: { id: true },
    });
    if (match) puestoId = match.id;
  }

  // Alternativa: si el formulario tiene un puesto vinculado único, úsalo.
  if (!puestoId) {
    const vinculos = await prisma.formularioPuesto.findMany({ where: { formularioId }, select: { puestoId: true } });
    if (vinculos.length === 1) puestoId = vinculos[0].puestoId;
  }

  // Crear Postulacion. Campos nuevos (origen, disciplina, nivel,
  // formularioRespuestaId) se insertan con raw SQL si el cliente de Prisma
  // todavía no los conoce (post-DDL se puede migrar a `prisma.postulacion.create`).
  const etapa = resultado.excluido ? "RECHAZADO" : "NUEVO";
  const postId = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO postulaciones (
       id, candidato_id, puesto_id, puesto_manual, area_manual, etapa,
       origen, disciplina, nivel, formulario_respuesta_id, puntaje_total,
       notas_evaluacion, created_at, updated_at, contrato_generado
     ) VALUES ($1,$2,$3,$4,$5,$6,'FORMULARIO',$7,$8,$9,$10,$11,now(),now(),false)`,
    postId,
    candidato.id,
    puestoId,
    puestoId ? null : puestoResp,
    null,
    etapa,
    disciplinaResp,
    nivelResp,
    respuestaId,
    resultado.porcentajeFinal ?? resultado.porcentajePreliminar ?? null,
    resultado.motivoExclusion
      ? `Excluido automático: ${resultado.motivoExclusion.texto} → ${resultado.motivoExclusion.respuesta}`
      : null,
  );
}
