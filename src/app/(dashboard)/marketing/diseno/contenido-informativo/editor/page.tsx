import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import {
  contenidoEditableFields,
  contenidoSlides,
  ideaToData,
  type ContenidoData,
} from "@/lib/diseno/contenido/data";
import { ideaPorId } from "@/lib/diseno/contenido/inventario";
import { ranuraParaEditar } from "@/lib/diseno/contenido/seleccion";
import { getDiseno } from "@/lib/diseno/guardados";
import { getByPath } from "@/lib/diseno/overrides";
import DesignEditor from "../../_components/DesignEditor";

export const dynamic = "force-dynamic";
const TEMPLATE = "contenido-informativo";

// Editor de UNA pieza de contenido: cambia textos y fotos por slide y persiste
// como overrides sobre la ranura de la semana (DisenoGuardado con ancla).
export default async function ContenidoEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ disenoId?: string; semana?: string; pieza?: string }>;
}) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const { disenoId, semana, pieza } = await searchParams;

  // Sin diseño materializado: crea/reutiliza la ranura de la semana y fija el id.
  if (!disenoId) {
    const idea = await ideaPorId(pieza);
    if (!semana || !idea) notFound();
    const id = await ranuraParaEditar(semana, idea);
    redirect(`/marketing/diseno/${TEMPLATE}/editor?disenoId=${id}&semana=${semana}`);
  }

  const guardado = await getDiseno(disenoId);
  if (!guardado) notFound();

  // La idea base es el snapshot congelado de la ranura.
  const data = (guardado.snapshot as ContenidoData) ?? null;
  if (!data) notFound();

  const fields = contenidoEditableFields();
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
      slides={contenidoSlides()}
      fields={fields}
      original={original}
      initialOverrides={guardado.overrides}
    />
  );
}
