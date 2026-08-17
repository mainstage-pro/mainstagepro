import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
const PAGE_TOKEN   = process.env.META_PAGE_ACCESS_TOKEN   ?? "";

// ── Field name matchers (Meta usa el label de la pregunta como key) ────────────
function getField(fields: { name: string; values: string[] }[], ...keys: string[]) {
  for (const key of keys) {
    const f = fields.find((f) => f.name.toLowerCase().includes(key.toLowerCase()));
    if (f?.values?.[0]) return f.values[0];
  }
  return null;
}

function mapTipoEvento(respuesta: string | null): string {
  if (!respuesta) return "VARIOS";
  const r = respuesta.toLowerCase();
  if (r.includes("boda") || r.includes("quinceañera") || r.includes("quince") || r.includes("graduaci")) return "SOCIAL";
  if (r.includes("empresarial") || r.includes("conferencia") || r.includes("corporativo"))              return "EMPRESARIAL";
  if (r.includes("concierto") || r.includes("festival") || r.includes("musical"))                       return "MUSICAL";
  if (r.includes("deport") || r.includes("comedia") || r.includes("stand") || r.includes("teatro") ||
      r.includes("prensa") || r.includes("cultural") || r.includes("religios"))                         return "OTRO";
  return "VARIOS";
}

// ── GET — verificación de webhook con Meta ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST — recibir notificación de nuevo lead ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        if (change?.field !== "leadgen") continue;

        const leadgenId = change?.value?.leadgen_id;
        const campana   = change?.value?.ad_name ?? change?.value?.campaign_name ?? null;
        if (!leadgenId) continue;

        // ── 1. Obtener datos del lead desde la Graph API ──────────────────────
        if (!PAGE_TOKEN) {
          console.error("[meta-leads] META_PAGE_ACCESS_TOKEN no configurado");
          continue;
        }

        const gRes = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,created_time,field_data,ad_id,campaign_id&access_token=${PAGE_TOKEN}`
        );
        if (!gRes.ok) {
          console.error("[meta-leads] Error Graph API:", await gRes.text());
          continue;
        }

        const lead = await gRes.json() as {
          id: string;
          created_time?: string;
          ad_id?: string;
          field_data?: { name: string; values: string[] }[];
        };

        const fields     = lead.field_data ?? [];
        const nombre     = getField(fields, "full_name", "nombre", "name") ?? "Lead Meta Ads";
        const telefono   = getField(fields, "phone_number", "telefono", "phone", "celular") ?? null;
        const email      = getField(fields, "email", "correo") ?? null;
        const ciudad     = getField(fields, "ciudad", "city", "location") ?? null;
        const tipoRaw    = getField(fields, "tipo de evento", "evento", "produccion", "producción", "servicio");
        const tipoEvento = mapTipoEvento(tipoRaw);
        const notaRaw    = tipoRaw ?? getField(fields, "descripcion", "descripción", "nota", "mensaje") ?? null;

        // ── 2. Buscar o crear cliente ─────────────────────────────────────────
        const telefonoLimpio = telefono?.replace(/\D/g, "") ?? null;

        const existente = telefonoLimpio
          ? await prisma.cliente.findFirst({
              where: { telefono: { contains: telefonoLimpio.slice(-10) } },
            })
          : null;

        let clienteId: string;

        if (existente) {
          // Cliente ya existe — actualizar origenLead si no tenía
          clienteId = existente.id;
          // Solo se completa la atribución de origen; no se degrada la
          // clasificación: si ya es cliente, sigue siendo cliente.
          await prisma.cliente.update({
            where: { id: clienteId },
            data: {
              ...(existente.origenLead ? {} : { origenLead: "META_ADS" }),
              ...(campana && !existente.campana ? { campana } : {}),
            },
          });
        } else {
          // Crear nuevo cliente como prospecto
          const notas = [
            "📋 Lead generado desde Meta Ads Instant Form",
            tipoRaw ? `Tipo de evento: ${tipoRaw}` : null,
            ciudad ? `Ciudad: ${ciudad}` : null,
            campana ? `Campaña: ${campana}` : null,
          ].filter(Boolean).join("\n");

          const c = await prisma.cliente.create({
            data: {
              nombre,
              telefono: telefono ?? null,
              correo:   email    ?? null,
              tipoCliente:   "B2C",
              clasificacion: "NUEVO",
              esProspecto:   true,
              origenLead:    "META_ADS",
              campana:       campana ?? null,
              notas:         notas || null,
            },
          });
          clienteId = c.id;
        }

        // ── 3. Crear Prospeccion (ruta de 5 contactos) — si no tiene una activa ──
        const prospeccionExistente = await prisma.prospeccion.findFirst({
          where: { clienteId, estado: { in: ["ACTIVO", "SIN_ETAPA"] } },
        });

        if (!prospeccionExistente) {
          await prisma.prospeccion.create({
            data: {
              tipo:       "NUEVO_PROSPECTO",
              etapa:      "NUEVO_CONTACTO",
              tipoEvento,
              origen:     "META_ADS",
              estado:     "ACTIVO",
              notas:      notaRaw ? `${notaRaw}${ciudad ? `\nCiudad: ${ciudad}` : ""}` : null,
              lugarEstimado: ciudad ?? null,
              clienteId,
            },
          });
        }

        // ── 4. Notificar a admins ─────────────────────────────────────────────
        try {
          const admins = await prisma.user.findMany({
            where:  { role: "ADMIN", active: true },
            select: { id: true },
          });
          if (admins.length > 0) {
            await prisma.notificacion.createMany({
              data: admins.map((u) => ({
                usuarioId: u.id,
                tipo:      "TAREA",
                titulo:    `⚡ Nuevo prospecto — ${nombre}`,
                mensaje:   `Meta Ads · ${tipoEvento}${ciudad ? ` · ${ciudad}` : ""}${campana ? ` · ${campana}` : ""}`,
                url:       `/crm/tratos`,
              })),
            });
          }
        } catch { /* notificaciones opcionales */ }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meta-leads webhook]", err);
    return NextResponse.json({ ok: true }); // siempre 200 para que Meta no reintente
  }
}
