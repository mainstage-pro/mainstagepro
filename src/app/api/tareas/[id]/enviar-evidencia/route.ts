import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";
import { grupoWhatsappDeArea, textoComprobacion } from "@/lib/whatsapp-grupos";

// POST /api/tareas/[id]/enviar-evidencia
// Marca la comprobación como enviada por WhatsApp. Es precondición para verificar.
// Devuelve el link del grupo (si está configurado) y el texto prellenado para
// que el front abra WhatsApp.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const { id } = await params;

  const tarea = await prisma.tarea.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      area: true,
      tipoEvidencia: true,
      evidenciaNota: true,
      requiereEvidencia: true,
      asignadoA: { select: { name: true } },
      archivos: { select: { url: true } },
    },
  });
  if (!tarea) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.tarea.update({
    where: { id },
    data: {
      evidenciaEnviadaAt: new Date(),
      evidenciaEnviadaPorId: session.id,
      evidenciaEnviadaCanal: "WHATSAPP",
    },
  });

  const texto = textoComprobacion({
    titulo: tarea.titulo,
    area: tarea.area,
    responsable: tarea.asignadoA?.name ?? session.name,
    tipoEvidencia: tarea.tipoEvidencia,
    nota: tarea.evidenciaNota,
    urls: tarea.archivos.map(a => a.url),
  });

  const grupoUrl = grupoWhatsappDeArea(tarea.area);
  // Si hay grupo configurado, se abre ese chat; si no, el share universal.
  const waUrl = grupoUrl
    ? grupoUrl
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return NextResponse.json({ ok: true, waUrl, texto, grupoConfigurado: !!grupoUrl });
}
