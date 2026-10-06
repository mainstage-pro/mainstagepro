import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileStack } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SitePlanEditor from "@/components/site-plan/SitePlanEditor";
import { generarTokenSitePlan } from "@/lib/site-plan-token";

export const dynamic = "force-dynamic";

export default async function SitePlanProyectoEditorPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, planId } = await params;

  const plan = await prisma.sitePlan.findFirst({
    where: { id: planId, proyectoId: id, activo: true },
    select: {
      id: true,
      nombre: true,
      fondoUrl: true,
      fondoAncho: true,
      fondoAlto: true,
      escalaMPorPx: true,
      contenido: true,
    },
  });
  if (!plan) notFound();

  const token = generarTokenSitePlan(plan.id);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Link
          href={`/proyectos/${id}/site-plan`}
          className="ms-micro text-[#666] hover:text-[#B3985B] flex items-center gap-1 w-fit"
        >
          <ChevronLeft size={12} /> Planos del proyecto
        </Link>
        <Link
          href={`/proyectos/${id}/site-plan/${plan.id}/documentos`}
          className="ms-micro text-[#666] hover:text-[#B3985B] flex items-center gap-1"
        >
          <FileStack size={12} /> Documentos y revisiones
        </Link>
      </div>

      <SitePlanEditor
        plan={plan}
        pdfHref={`/api/site-planes/${plan.id}/pdf?preview=1`}
        publicoHref={`/site-plan/${plan.id}?token=${token}`}
      />
    </div>
  );
}
