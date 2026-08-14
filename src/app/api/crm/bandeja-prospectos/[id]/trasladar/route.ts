import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEntradasProspectoTable } from "@/lib/bandeja-prospectos";
import { parsePerfiles, serializePerfiles } from "@/lib/proceso/perfiles";

// Convierte una entrada de la bandeja en un prospecto real (Cliente esProspecto=true).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  await ensureEntradasProspectoTable();
  const entrada = await prisma.entradaProspecto.findUnique({ where: { id } });
  if (!entrada) return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });
  if (entrada.estado === "TRASLADADO" && entrada.clienteId) {
    return NextResponse.json({ clienteId: entrada.clienteId, yaExistia: true });
  }

  const nombre = ((body.nombre ?? entrada.nombre) ?? "").trim();
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio para trasladar" }, { status: 400 });

  const perfilesArr: string[] = Array.isArray(body.perfilesProspecto)
    ? body.perfilesProspecto
    : parsePerfiles(entrada.perfilesProspecto);
  const perfilesJson = serializePerfiles(perfilesArr);

  const empresaNombre: string | null = (body.empresa ?? entrada.empresa) || null;
  let empresaId: string | null = null;
  if (empresaNombre) {
    const existing = await prisma.empresa.findFirst({
      where: { nombre: { equals: empresaNombre, mode: "insensitive" }, activo: true },
    });
    empresaId = existing ? existing.id : (await prisma.empresa.create({ data: { nombre: empresaNombre, tipo: "CLIENTE" } })).id;
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          nombre,
          empresa: empresaNombre,
          empresaId,
          tipoCliente: "POR_DESCUBRIR",
          clasificacion: "PROSPECTO",
          perfilProspecto: perfilesArr[0] || null,
          perfilesProspecto: perfilesJson,
          telefono: (body.telefono ?? entrada.telefono) || null,
          correo: (body.correo ?? entrada.correo) || null,
          notas: (body.notas ?? entrada.notas) || null,
          origenLead: (body.origenLead ?? entrada.origenLead) || "PROSPECCION",
          esProspecto: true,
        },
      });
      await tx.entradaProspecto.update({
        where: { id: entrada.id },
        data: { estado: "TRASLADADO", clienteId: cliente.id },
      });
      return cliente;
    });
    return NextResponse.json({ clienteId: resultado.id });
  } catch (e) {
    console.error("[/api/crm/bandeja-prospectos/[id]/trasladar]", e);
    return NextResponse.json({ error: "No se pudo trasladar la entrada" }, { status: 500 });
  }
}
