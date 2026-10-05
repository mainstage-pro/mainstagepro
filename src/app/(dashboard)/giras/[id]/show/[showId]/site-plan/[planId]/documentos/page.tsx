import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsearContenido } from "@/lib/site-plan";
import { generarTokenSitePlan } from "@/lib/site-plan-token";
import DocumentosDelPlano from "./DocumentosDelPlano";

export const dynamic = "force-dynamic";

export default async function DocumentosSitePlanPage({
  params,
}: {
  params: Promise<{ id: string; showId: string; planId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId, planId } = await params;

  const plan = await prisma.sitePlan.findFirst({
    where: { id: planId, showId, activo: true },
    include: {
      show: { select: { fecha: true, ciudad: true, venue: { select: { nombre: true, direccion: true } } } },
      variantes: {
        where: { activo: true },
        include: {
          revisiones: { orderBy: { numero: "desc" } },
          emisiones: { orderBy: { fecha: "desc" } },
        },
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!plan) notFound();

  const { capas, objetos } = parsearContenido(plan.contenido);
  const token = generarTokenSitePlan(plan.id);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <Link
        href={`/giras/${id}/show/${showId}/site-plan/${plan.id}`}
        className="ms-micro text-[#666] hover:text-[#B3985B] flex items-center gap-1 w-fit"
      >
        <ChevronLeft size={12} /> Volver al plano
      </Link>

      <div>
        <h1 className="ms-h1">{plan.nombre}</h1>
        <p className="ms-subtitle">
          El cuadro de datos del plano y los documentos que salen de él, cada uno con su revisión.
        </p>
      </div>

      <DocumentosDelPlano
        planId={plan.id}
        token={token}
        capas={capas.map(c => ({ id: c.id, nombre: c.nombre, cuantos: objetos.filter(o => o.capaId === c.id).length }))}
        cuadro={{
          direccionSitio: plan.direccionSitio ?? plan.show?.venue?.direccion ?? "",
          norteGrados: plan.norteGrados,
          dibujadoPor: plan.dibujadoPor ?? session.name ?? "",
          responsableSitio: plan.responsableSitio ?? "",
          clienteOPromotor: plan.clienteOPromotor ?? "",
          capacidadSitio: plan.capacidadSitio,
          capacidadEvacuacion: plan.capacidadEvacuacion,
        }}
        variantes={plan.variantes.map(v => ({
          id: v.id,
          nombre: v.nombre,
          clave: v.clave,
          estado: v.estado,
          revision: v.revision,
          capasIds: v.capasIds,
          soloElectrico: v.soloElectrico,
          soloEmergencia: v.soloEmergencia,
          notas: v.notas,
          revisiones: v.revisiones.map(r => ({
            id: r.id,
            numero: r.numero,
            descripcion: r.descripcion,
            autor: r.autor,
            fecha: r.fecha.toISOString(),
          })),
          emisiones: v.emisiones.map(e => ({
            id: e.id,
            revision: e.revision,
            destinatario: e.destinatario,
            organizacion: e.organizacion,
            medio: e.medio,
            fecha: e.fecha.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
