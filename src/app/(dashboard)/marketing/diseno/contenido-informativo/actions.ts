"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { getIdea } from "@/lib/diseno/contenido/data";
import { aprobarSemana } from "@/lib/diseno/contenido/seleccion";

const RUTA = "/marketing/diseno/contenido-informativo";

// Aprobar una pieza para su semana: guarda snapshot APROBADO y vuelve al calendario.
export async function aprobarAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) redirect("/login");

  const pieza = String(formData.get("pieza") ?? "");
  const semana = String(formData.get("semana") ?? "");
  const idea = getIdea(pieza);
  if (idea && semana) {
    await aprobarSemana(semana, idea);
    revalidatePath(RUTA);
  }
  redirect(RUTA);
}
