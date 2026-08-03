import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { SUPRATERRA, briefSlides, briefEditableFields } from "@/lib/diseno/brief-tecnico/data";
import { buildBriefStructure } from "@/lib/diseno/brief-tecnico/build";
import { getByPath, type DesignOverrides } from "@/lib/diseno/overrides";
import DesignEditor from "../../_components/DesignEditor";

export const dynamic = "force-dynamic";
const TEMPLATE = "brief-tecnico";

export default async function BriefEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ disenoId?: string; proyectoId?: string }>;
}) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const sp = await searchParams;

  // Sin diseño → crea un borrador (para el proyecto o la muestra) y redirige.
  if (!sp.disenoId) {
    let proyectoId: string | null = sp.proyectoId ?? null;
    let titulo = "Muestra (Expo Supraterra)";
    if (proyectoId) {
      const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { nombre: true } });
      if (p) titulo = p.nombre;
      else proyectoId = null;
    }
    const nuevo = await prisma.disenoGuardado.create({
      data: { template: TEMPLATE, proyectoId, titulo, overrides: {}, estado: "BORRADOR" },
    });
    redirect(`/marketing/diseno/${TEMPLATE}/editor?disenoId=${nuevo.id}`);
  }

  const guardado = await prisma.disenoGuardado.findUnique({ where: { id: sp.disenoId } });
  if (!guardado) notFound();

  const proyectoId = guardado.proyectoId;
  const overrides = (guardado.overrides as DesignOverrides) ?? {};

  // Estructura determinista (sin IA) para conocer slides y campos editables.
  const data = proyectoId ? (await buildBriefStructure(proyectoId)) ?? SUPRATERRA : SUPRATERRA;
  const slides = briefSlides(data);
  const fields = briefEditableFields(data);

  const original: Record<string, string> = {};
  for (const f of fields) {
    const v = getByPath(data, f.path);
    original[f.path] = Array.isArray(v) ? v.join("\n") : v == null ? "" : String(v);
  }

  return (
    <DesignEditor
      template={TEMPLATE}
      disenoId={guardado.id}
      titulo={guardado.titulo}
      slides={slides}
      fields={fields}
      original={original}
      initialOverrides={overrides}
    />
  );
}
