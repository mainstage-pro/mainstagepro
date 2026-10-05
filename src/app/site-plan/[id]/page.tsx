import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SitePlanVista from "@/components/site-plan/SitePlanVista";
import { validarTokenSitePlan } from "@/lib/site-plan-token";
import { fmtFechaLarga } from "@/lib/giras";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const dynamic = "force-dynamic";

async function cargar(id: string) {
  return prisma.sitePlan.findFirst({
    where: { id, activo: true },
    include: {
      venue: { select: { nombre: true, ciudad: true } },
      show: {
        select: {
          fecha: true,
          ciudad: true,
          gira: { select: { nombre: true } },
          venue: { select: { nombre: true } },
        },
      },
    },
  });
}

function subtituloDe(plan: Awaited<ReturnType<typeof cargar>>): string {
  if (!plan) return "";
  return [
    plan.show?.gira.nombre,
    plan.show?.venue?.nombre ?? plan.venue?.nombre,
    plan.show?.ciudad ?? plan.venue?.ciudad,
    plan.show ? fmtFechaLarga(plan.show.fecha) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { token } = await searchParams;
  if (!validarTokenSitePlan(id, token)) return { title: "Site plan" };
  const plan = await cargar(id);
  if (!plan) return { title: "Site plan" };
  return {
    title: `${plan.nombre} · Site plan`,
    description: subtituloDe(plan),
    robots: { index: false, follow: false },
  };
}

export default async function SitePlanPublicoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!validarTokenSitePlan(id, token)) notFound();

  const plan = await cargar(id);
  if (!plan) notFound();

  return (
    <div className="h-dvh flex flex-col bg-black text-white p-3 sm:p-5 gap-3">
      <header className="flex items-start justify-between gap-3">
        <p className="text-[10px] tracking-[0.3em] text-[#B3985B]">SITE PLAN</p>
        <a
          href={`/api/site-planes/${plan.id}/pdf?token=${token}`}
          className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white border border-white/12 rounded-lg px-2.5 py-1.5"
        >
          <Download size={13} /> PDF
        </a>
      </header>

      <SitePlanVista
        nombre={plan.nombre}
        subtitulo={subtituloDe(plan)}
        contenido={plan.contenido}
        fondoUrl={plan.fondoUrl}
        fondoAncho={plan.fondoAncho}
        fondoAlto={plan.fondoAlto}
        escala={plan.escalaMPorPx}
        notas={plan.notas}
      />
    </div>
  );
}
