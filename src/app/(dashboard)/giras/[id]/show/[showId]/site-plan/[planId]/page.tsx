import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SitePlanEditor from "@/components/site-plan/SitePlanEditor";
import { generarTokenSitePlan } from "@/lib/site-plan-token";

export const dynamic = "force-dynamic";

export default async function SitePlanEditorPage({
  params,
}: {
  params: Promise<{ id: string; showId: string; planId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, showId, planId } = await params;

  const plan = await prisma.sitePlan.findFirst({
    where: { id: planId, showId, activo: true },
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
      <Link
        href={`/giras/${id}/show/${showId}/site-plan`}
        className="ms-micro text-[#666] hover:text-[#B3985B] flex items-center gap-1 w-fit"
      >
        <ChevronLeft size={12} /> Planos del show
      </Link>

      <SitePlanEditor
        plan={plan}
        pdfHref={`/api/site-planes/${plan.id}/pdf?preview=1`}
        publicoHref={`/site-plan/${plan.id}?token=${token}`}
      />
    </div>
  );
}
