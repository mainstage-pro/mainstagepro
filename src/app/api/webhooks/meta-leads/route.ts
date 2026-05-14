import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
const PAGE_TOKEN   = process.env.META_PAGE_ACCESS_TOKEN   ?? "";

// ── Field name matchers (Meta uses the question label as the key) ─────────────
function getField(fields: { name: string; values: string[] }[], ...keys: string[]) {
  for (const key of keys) {
    const f = fields.find((f) => f.name.toLowerCase().includes(key.toLowerCase()));
    if (f?.values?.[0]) return f.values[0];
  }
  return null;
}

function mapTipoEvento(respuesta: string | null): string {
  if (!respuesta) return "OTRO";
  const r = respuesta.toLowerCase();
  if (r.includes("boda") || r.includes("quinceañera") || r.includes("quince") || r.includes("graduaci"))  return "SOCIAL";
  if (r.includes("empresarial") || r.includes("conferencia")) return "EMPRESARIAL";
  if (r.includes("concierto") || r.includes("festival"))      return "MUSICAL";
  return "OTRO";
}

// ── GET — verificación de webhook ─────────────────────────────────────────────
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

// ── POST — recibir lead ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta envía un array de entries; procesamos todos
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        if (change?.field !== "leadgen") continue;

        const leadgenId = change?.value?.leadgen_id;
        if (!leadgenId) continue;

        // Obtener datos del lead desde la Graph API
        const gRes = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${PAGE_TOKEN}`
        );
        if (!gRes.ok) continue;

        const lead = await gRes.json() as {
          id: string;
          created_time?: string;
          field_data?: { name: string; values: string[] }[];
        };

        const fields     = lead.field_data ?? [];
        const nombre     = getField(fields, "full_name", "nombre") ?? "Lead Meta Ads";
        const telefono   = getField(fields, "phone_number", "telefono", "phone") ?? null;
        const tipoRaw    = getField(fields, "tipo de evento", "evento", "producción");
        const fechaText  = getField(fields, "fecha", "date");
        const lugar      = getField(fields, "ciudad", "venue", "lugar");
        const tipoEvento = mapTipoEvento(tipoRaw);

        // Buscar cliente existente por teléfono para evitar duplicados
        let clienteId: string;
        const telefonoLimpio = telefono?.replace(/\D/g, "") ?? null;

        const existente = telefonoLimpio
          ? await prisma.cliente.findFirst({ where: { telefono: { contains: telefonoLimpio.slice(-10) } } })
          : null;

        if (existente) {
          clienteId = existente.id;
        } else {
          const c = await prisma.cliente.create({
            data: {
              nombre,
              telefono: telefono ?? null,
              tipoCliente: "B2C",
              clasificacion: "NUEVO",
            },
          });
          clienteId = c.id;
        }

        // Armar notas con toda la info del formulario
        const notasPartes: string[] = ["📋 Lead generado desde Meta Ads Instant Form"];
        if (tipoRaw)    notasPartes.push(`Tipo de evento: ${tipoRaw}`);
        if (fechaText)  notasPartes.push(`Fecha estimada: ${fechaText}`);
        if (lugar)      notasPartes.push(`Lugar / Ciudad: ${lugar}`);

        const trato = await prisma.trato.create({
          data: {
            clienteId,
            tipoEvento,
            tipoLead:       "INBOUND",
            origenLead:     "META_ADS",
            origenVenta:    "PUBLICIDAD",
            estatusContacto:"PENDIENTE",
            etapa:          "DESCUBRIMIENTO",
            clasificacion:  "PROSPECTO",
            tipoProspecto:  "ACTIVO",
            canalAtencion:  "FORMULARIO",
            rutaEntrada:    "DESCUBRIR",
            lugarEstimado:  lugar ?? null,
            notas:          notasPartes.join("\n"),
            formRespuestas: JSON.stringify({
              leadgenId,
              fields: fields.map((f) => ({ pregunta: f.name, respuesta: f.values[0] ?? "" })),
            }),
          },
        });

        // Notificar a todos los admins
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN", active: true },
          select: { id: true },
        });

        await prisma.notificacion.createMany({
          data: admins.map((u) => ({
            usuarioId: u.id,
            tipo:      "TAREA",
            titulo:    `Nuevo lead — ${nombre}`,
            mensaje:   `Meta Ads · ${tipoRaw ?? tipoEvento}${lugar ? ` · ${lugar}` : ""}`,
            url:       `/crm/tratos/${trato.id}`,
          })),
        });
      }
    }

    // Meta requiere 200 rápido o reintenta
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meta-leads webhook]", err);
    return NextResponse.json({ ok: true }); // devolver 200 igual para que Meta no reintente
  }
}
